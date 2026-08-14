-- Embeddable widgets: extends funnel_events with embed provenance.
--
-- funnel_events (20260820000000) predates this work and has no source/
-- origin-domain concept — bookings.source/origin_domain were added in that
-- same migration, ahead of this one, specifically for this feature. This
-- migration does the matching extension on funnel_events itself so widget
-- loads/interactions can be attributed to the embedding domain the same way
-- embed-originated bookings already can be.
--
-- Two new event_type values are added rather than overloading the existing
-- four: 'embed_view' (widget rendered) and 'embed_interaction' (Book click,
-- review click-through, etc. — the specific interaction goes in metadata).
-- These are widget-lifecycle events, not pre-booking funnel steps, but they
-- share funnel_events' shape (session_id, provider_id, metadata) closely
-- enough that a second table would just duplicate columns for no query
-- benefit — Prompt 03's provider analytics reads both by provider_id anyway.
--
-- Idempotent and strictly additive.

ALTER TABLE funnel_events
  ADD COLUMN IF NOT EXISTS origin_domain TEXT;

COMMENT ON COLUMN funnel_events.origin_domain IS
  'Referring third-party domain for embed_view / embed_interaction events. NULL for on-site funnel events.';

ALTER TABLE funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_type_check;

ALTER TABLE funnel_events
  ADD CONSTRAINT funnel_events_type_check CHECK (
    event_type IN (
      'search_performed',
      'profile_viewed',
      'service_viewed',
      'review_submitted',
      'embed_view',
      'embed_interaction'
    )
  );

CREATE INDEX IF NOT EXISTS funnel_events_origin_domain_created_idx
  ON funnel_events(origin_domain, created_at DESC)
  WHERE origin_domain IS NOT NULL;
