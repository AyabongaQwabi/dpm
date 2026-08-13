-- =============================================================================
-- Booking lifecycle, step 2 of 2: event log, requirements snapshot, file
-- exchange, booking messages, and the RLS that guards all of them.
--
-- Runs after 20260818000000 so the new booking_status values are committed
-- and usable here.
--
-- Idempotent and strictly additive throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. booking_events
--
-- Part 2 asks for a `booking_events` table (booking_id, from_status,
-- to_status, actor_id, actor_role, note, created_at). `booking_status_history`
-- already exists with almost exactly that shape and already has live writers
-- in three files. We EXTEND it rather than build a parallel log:
--
--   existing: id, booking_id, from_status, to_status, actor_type, actor_id,
--             created_at
--   added:    note TEXT, event_type TEXT
--
-- `actor_type` is the existing name for the prompt's `actor_role` and carries
-- the right enum (customer|provider|system) — reused as-is rather than adding
-- a duplicate column.
--
-- `event_type` lets the same log carry non-status events (Part 3 requires
-- file downloads to be logged "as a non-status event"). For those rows
-- to_status repeats the booking's current status, since to_status is NOT NULL
-- on the existing table and that constraint is not ours to relax.
--
-- A `booking_events` VIEW exposes the prompt's vocabulary over the same rows,
-- so future code can read either name without a second source of truth.
-- ---------------------------------------------------------------------------

ALTER TABLE booking_status_history
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'status_change';

CREATE INDEX IF NOT EXISTS booking_status_history_booking_id_created_at_idx
  ON booking_status_history (booking_id, created_at);

CREATE OR REPLACE VIEW booking_events AS
  SELECT
    id,
    booking_id,
    from_status,
    to_status,
    actor_type AS actor_role,
    actor_id,
    event_type,
    note,
    created_at
  FROM booking_status_history;

-- booking_status_history shipped without RLS. Enable it now (customer and
-- provider parties read their own booking's timeline; writes are service-role
-- only, matching the project-wide convention).
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties read own booking events" ON booking_status_history;
CREATE POLICY "parties read own booking events"
  ON booking_status_history FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. booking_requirements — the snapshot
--
-- Taken at booking time from service_packages.requirements (freetext) and
-- service_packages.requirement_file_slots (JSONB [{name}]). Per the product
-- owner's explicit instruction, service_packages is NOT migrated: there is no
-- required/optional flag, no accepted-file-type list and no multiplicity
-- constraint in the source shape, so this snapshot does not invent them.
-- Every slot accepts any file type and any number of files; array order is
-- display order and is captured in sort_order.
--
-- The snapshot is deliberate: if the provider later edits or deletes a slot on
-- the package, bookings already in flight must not change underneath the
-- customer. Every screen in this build reads booking_requirements, never the
-- live package.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_requirements (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id  TEXT        NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  -- Index of the source slot in service_packages.requirement_file_slots at
  -- snapshot time. The source array has no stable per-slot id, so this is the
  -- only honest back-pointer available; nullable for the freetext row.
  source_slot_index INTEGER,
  -- The package the snapshot was taken from, for provenance.
  source_package_id TEXT  REFERENCES service_packages (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_requirements_booking_id_idx
  ON booking_requirements (booking_id, sort_order);

ALTER TABLE booking_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties read own booking requirements" ON booking_requirements;
CREATE POLICY "parties read own booking requirements"
  ON booking_requirements FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. booking_messages
--
-- Part 4 scopes a thread tightly to one booking. The pre-existing
-- message_threads/messages pair is provider×customer×service scoped with an
-- optional booking_id and is used by the live /customer-account/messages and
-- /provider-dashboard/messages inboxes — it is left completely untouched.
-- booking_messages is the booking-scoped thread the prompt specifies.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_messages (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id  TEXT        NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  sender_id   TEXT        NOT NULL,
  sender_role actor_type  NOT NULL,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS booking_messages_booking_id_created_at_idx
  ON booking_messages (booking_id, created_at);

-- Powers the unread badge without a full scan.
CREATE INDEX IF NOT EXISTS booking_messages_unread_idx
  ON booking_messages (booking_id, sender_role)
  WHERE read_at IS NULL;

ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties read own booking messages" ON booking_messages;
CREATE POLICY "parties read own booking messages"
  ON booking_messages FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. booking_files
--
-- One file system for both requirement uploads and message attachments
-- (message_id nullable), per Part 3/Part 4. requirement_id is nullable so
-- ad-hoc files are allowed. Removal is a soft delete (deleted_at); the
-- storage object is swept by a cleanup job, never inline.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_files (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id        TEXT        NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  requirement_id    TEXT        REFERENCES booking_requirements (id) ON DELETE SET NULL,
  message_id        TEXT        REFERENCES booking_messages (id) ON DELETE SET NULL,
  uploaded_by       TEXT        NOT NULL,
  uploader_role     actor_type  NOT NULL,
  storage_path      TEXT        NOT NULL UNIQUE,
  original_filename TEXT        NOT NULL,
  mime_type         TEXT        NOT NULL DEFAULT 'application/octet-stream',
  size_bytes        BIGINT      NOT NULL CHECK (size_bytes >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS booking_files_booking_id_idx
  ON booking_files (booking_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_files_requirement_id_idx
  ON booking_files (requirement_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_files_message_id_idx
  ON booking_files (message_id) WHERE deleted_at IS NULL;

ALTER TABLE booking_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties read own booking files" ON booking_files;
CREATE POLICY "parties read own booking files"
  ON booking_files FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Storage bucket: booking-files (private)
--
-- The two existing buckets are provider-facing only and neither has any
-- customer-upload policy, so a third, booking-scoped private bucket is the
-- clean move. Path convention:
--   bookings/{booking_id}/{requirement_id|ad-hoc}/{uuid}-{sanitised_filename}
-- so foldername(name)[2] is the booking id.
--
-- No allowed_mime_types list: per the product owner, every requirement slot
-- accepts any file type. file_size_limit mirrors
-- config/booking-lifecycle.json → files.maxFileSizeMb (20 MB, CONFIRMED).
-- Keep the two in step if that number changes.
--
-- Reads in the application always go through a server route that authorises
-- the requester and issues a short-lived signed URL; these policies are the
-- second line of defence.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-files', 'booking-files', false, 20971520) -- 20 MB
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Booking parties can read booking files" ON storage.objects;
CREATE POLICY "Booking parties can read booking files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'booking-files'
    AND (storage.foldername(name))[2] IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

DROP POLICY IF EXISTS "Booking parties can upload booking files" ON storage.objects;
CREATE POLICY "Booking parties can upload booking files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'booking-files'
    AND (storage.foldername(name))[2] IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );

DROP POLICY IF EXISTS "Booking parties can remove booking files" ON storage.objects;
CREATE POLICY "Booking parties can remove booking files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'booking-files'
    AND (storage.foldername(name))[2] IN (
      SELECT id FROM bookings
      WHERE customer_id IN (
              SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
            )
         OR provider_id IN (
              SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
            )
    )
  );
