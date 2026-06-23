-- Verification tiers + business type capture.
-- Verification is layered: a provider can hold any combination of the three
-- tiers below. Each maps to a distinct badge in the UI.
--   verified_contact -> cell number + email confirmed
--   verified_cipc    -> registered CIPC business verified
--   verified_fica    -> FICA docs verified (ID + proof of address)
-- verified_badge_paid marks a provider who purchased the listing-boost badge.

CREATE TYPE business_type AS ENUM (
  'entrepreneur',
  'co_op',
  'company',
  'non_profit'
);

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS business_type        business_type,
  ADD COLUMN IF NOT EXISTS verified_contact     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_cipc        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_fica        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_badge_paid  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS providers_business_type_idx ON providers (business_type);
CREATE INDEX IF NOT EXISTS providers_verified_contact_idx ON providers (verified_contact);
CREATE INDEX IF NOT EXISTS providers_verified_cipc_idx ON providers (verified_cipc);
CREATE INDEX IF NOT EXISTS providers_verified_fica_idx ON providers (verified_fica);

-- Backfill: treat existing featured/seed providers as contact-verified so the
-- public marketplace shows sensible badges before real verification runs.
UPDATE providers SET verified_contact = TRUE WHERE is_featured = TRUE;
