-- Liquidity instrumentation, part 1: funnel events, and the booking-origin
-- columns a later embeds prompt needs.
--
-- funnel_events carries the pre-booking funnel only: search_performed,
-- service_viewed, review_submitted. The booking-lifecycle steps
-- (booking_started, booking_paid, booking_completed) are NOT duplicated
-- into this table — they are read at query time from the existing
-- booking_status_history / booking_events view, which already carries the
-- full booking timeline with RLS and live writers. See lib/liquidity/funnel.ts
-- for the query-time assembly.
--
-- provider_analytics_events (20260813000001) is a different, narrower thing:
-- single-provider-scoped, provider-readable, closed event_type vocabulary.
-- It is not extended here — this is a new, admin-readable, cross-provider
-- table with its own vocabulary.
--
-- Idempotent and strictly additive throughout.

-- ---------------------------------------------------------------------------
-- 1. bookings.source / origin_domain
--
-- Added now, ahead of the embeds prompt that will populate them, because it
-- is materially cheaper to land these two nullable columns alongside this
-- migration than as a standalone one later. Nothing in this migration
-- populates them; every booking created before the embeds work ships lands
-- with source = 'site' (the only value in use today) and origin_domain NULL.
-- ---------------------------------------------------------------------------

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS origin_domain TEXT;

COMMENT ON COLUMN bookings.source IS
  'Channel the booking was created from. ''site'' until the embeds work (a later prompt) starts writing ''embed''.';
COMMENT ON COLUMN bookings.origin_domain IS
  'Referring third-party domain for source = ''embed'' bookings. NULL for on-site bookings.';

-- ---------------------------------------------------------------------------
-- 2. funnel_events
--
-- Pre-booking funnel steps only. category and city are resolved values
-- (the category slug and the free-text providers.location_city string, not
-- an id into a cities table — no cities table exists in this schema; see
-- the liquidity-recon report). provider_id is nullable because
-- search_performed has no provider yet. session_id carries a
-- client-generated anonymous id for pre-auth events, matching the existing
-- session_hash pattern on provider_analytics_events; it is never a cookie or
-- fingerprint we did not already have a use for elsewhere in the app.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS funnel_events (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  event_type   TEXT        NOT NULL,
  category     TEXT,
  city         TEXT,
  provider_id  TEXT        REFERENCES providers(id) ON DELETE SET NULL,
  session_id   TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT funnel_events_type_check CHECK (
    event_type IN (
      'search_performed',
      'profile_viewed',
      'service_viewed',
      'review_submitted'
    )
  )
);

CREATE INDEX IF NOT EXISTS funnel_events_type_created_idx
  ON funnel_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS funnel_events_category_city_created_idx
  ON funnel_events(category, city, created_at DESC);

CREATE INDEX IF NOT EXISTS funnel_events_provider_created_idx
  ON funnel_events(provider_id, created_at DESC)
  WHERE provider_id IS NOT NULL;

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for anon/authenticated: admins are an env-configured
-- allowlist (lib/session.ts requireAdminSession), not a database role, so
-- the internal dashboard reads through createAdminClient() (service role,
-- bypasses RLS) exactly like app/admin/claims/page.tsx does today. Writes
-- are service-role only, matching provider_analytics_events.
REVOKE INSERT, UPDATE, DELETE, SELECT ON funnel_events FROM anon, authenticated;
