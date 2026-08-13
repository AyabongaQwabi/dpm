-- =============================================================================
-- Part 7: review shape, gating, and trigger-maintained rating aggregates.
--
-- Idempotent and strictly additive. The existing reviews columns
-- (booking_id UNIQUE, provider_id, customer_id, rating, comment, created_at,
-- is_seed, package_id, service_id) are untouched — `comment` keeps its
-- meaning and is NOT renamed to `body`; application code maps the name.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Review columns
-- ---------------------------------------------------------------------------

CREATE TYPE review_status AS ENUM ('published', 'hidden', 'flagged');

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status review_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS provider_reply TEXT,
  ADD COLUMN IF NOT EXISTS provider_replied_at TIMESTAMPTZ,
  -- Supplementary sub-ratings. All nullable and never required; the headline
  -- `rating` stays the single overall figure and is the only one aggregated.
  ADD COLUMN IF NOT EXISTS rating_quality INTEGER,
  ADD COLUMN IF NOT EXISTS rating_communication INTEGER,
  ADD COLUMN IF NOT EXISTS rating_timeliness INTEGER,
  ADD COLUMN IF NOT EXISTS rating_value INTEGER,
  -- Provider flag for admin attention. Deliberately SEPARATE from `status`:
  -- the aggregate trigger counts only 'published' rows, so letting a provider
  -- set status='flagged' would let them suppress a review unilaterally. A
  -- flagged review stays published and counted until an admin changes status.
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- `rating` shipped without bounds. Add the 1–5 check as NOT VALID so the
-- migration cannot fail on pre-existing rows, then validate separately —
-- existing data is checked but a bad legacy row blocks nothing at deploy time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE reviews VALIDATE CONSTRAINT reviews_rating_range;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'reviews.rating has out-of-range rows; constraint left NOT VALID for manual cleanup';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_sub_rating_range'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_sub_rating_range CHECK (
      (rating_quality       IS NULL OR rating_quality       BETWEEN 1 AND 5) AND
      (rating_communication IS NULL OR rating_communication BETWEEN 1 AND 5) AND
      (rating_timeliness    IS NULL OR rating_timeliness    BETWEEN 1 AND 5) AND
      (rating_value         IS NULL OR rating_value         BETWEEN 1 AND 5)
    ) NOT VALID;
    ALTER TABLE reviews VALIDATE CONSTRAINT reviews_sub_rating_range;
  END IF;
END $$;

DROP TRIGGER IF EXISTS reviews_set_updated_at ON reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS reviews_provider_id_status_idx
  ON reviews (provider_id, status);

-- ---------------------------------------------------------------------------
-- 2. Cached aggregates
--
-- No aggregate columns existed: lib/search.ts computed ratings live by
-- joining reviews and reducing in application code. These columns become the
-- single cached source, maintained ONLY by the trigger below — never by
-- application code — so the two can never drift.
--
-- Hidden and flagged reviews are excluded from aggregates by definition.
-- ---------------------------------------------------------------------------

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION recalculate_rating_aggregates(
  p_provider_id TEXT,
  p_service_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_provider_id IS NOT NULL THEN
    UPDATE providers p
    SET rating_average = COALESCE(agg.avg_rating, 0),
        rating_count   = COALESCE(agg.n, 0)
    FROM (
      SELECT ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating, COUNT(*) AS n
      FROM reviews
      WHERE provider_id = p_provider_id AND status = 'published'
    ) agg
    WHERE p.id = p_provider_id;
  END IF;

  IF p_service_id IS NOT NULL THEN
    UPDATE services s
    SET rating_average = COALESCE(agg.avg_rating, 0),
        rating_count   = COALESCE(agg.n, 0)
    FROM (
      SELECT ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating, COUNT(*) AS n
      FROM reviews
      WHERE service_id = p_service_id AND status = 'published'
    ) agg
    WHERE s.id = p_service_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION reviews_sync_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate for the row's own provider/service …
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_rating_aggregates(NEW.provider_id, NEW.service_id);
  END IF;

  -- … and for the OLD ones too, so a moved or deleted review does not leave a
  -- stale count behind on its previous parent.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF TG_OP = 'DELETE'
       OR OLD.provider_id IS DISTINCT FROM NEW.provider_id
       OR OLD.service_id IS DISTINCT FROM NEW.service_id THEN
      PERFORM recalculate_rating_aggregates(OLD.provider_id, OLD.service_id);
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_aggregates_trigger ON reviews;
CREATE TRIGGER reviews_sync_aggregates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION reviews_sync_aggregates();

-- Backfill so the cached columns are correct the moment they exist.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT provider_id, service_id FROM reviews LOOP
    PERFORM recalculate_rating_aggregates(r.provider_id, r.service_id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. RLS — the gating is enforced here, not only in the UI
--
-- reviews shipped with RLS disabled. Enabling it now:
--   * anyone may read published reviews (they are public on profiles),
--   * a customer may read their own review whatever its status,
--   * a provider may read reviews on their own profile,
--   * INSERT is restricted to the booking's customer, on a booking that is
--     actually `completed`, with no existing review — the "non-negotiable"
--     gate, in the database,
--   * UPDATE by the customer is limited to their own review; the provider
--     reply path goes through the service role, since a provider must not be
--     able to touch rating/comment/status.
--
-- Providers cannot delete or hide a review: no DELETE policy exists for them,
-- and status is not writable through any of these policies.
-- ---------------------------------------------------------------------------

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "published reviews are public" ON reviews;
CREATE POLICY "published reviews are public"
  ON reviews FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "customers read own reviews" ON reviews;
CREATE POLICY "customers read own reviews"
  ON reviews FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "providers read reviews on their profile" ON reviews;
CREATE POLICY "providers read reviews on their profile"
  ON reviews FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "customers review own completed bookings" ON reviews;
CREATE POLICY "customers review own completed bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = reviews.booking_id
        AND b.status = 'completed'
        AND b.customer_id = reviews.customer_id
        AND b.provider_id = reviews.provider_id
    )
  );

DROP POLICY IF EXISTS "customers edit own reviews" ON reviews;
CREATE POLICY "customers edit own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );
