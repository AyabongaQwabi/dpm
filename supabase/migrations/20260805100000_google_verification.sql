-- Google verification tier. Distinct from verified_contact/verified_cipc/
-- verified_fica (supabase/migrations/20260620000003_verification_business_type.sql),
-- which are all confirmed directly by ServicePros. verified_google instead
-- reflects that Google Places has confirmed the business is a real, listed
-- business at a real address — a signal we import, not one we perform
-- ourselves, so it sits below CIPC in the verification priority order.
--
-- Derived, not independently settable: a provider is Google verified
-- whenever it has a google_place_id (set by scripts/backfill-google-ratings.mjs
-- from Google Places data). Kept as a plain boolean column (rather than a
-- generated column) for indexing and consistency with the other verified_*
-- columns, and is (re)synced by the backfill script whenever it runs.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS verified_google BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS providers_verified_google_idx ON providers (verified_google);

-- Backfill from existing google_place_id data (set by the Google ratings
-- backfill script prior to this migration).
UPDATE providers SET verified_google = TRUE WHERE google_place_id IS NOT NULL;
