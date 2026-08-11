-- Real pipeline for the "contact verified" tier (components/ui/VerifiedBadge.tsx).
-- Previously verified_contact/verified_cipc/verified_fica were only ever set
-- by scripts/seed-verification-data.mjs — no provider-facing flow existed
-- despite /verification publicly claiming one does.
--
-- Scope: email-only for now (no SMS/OTP provider configured yet) — a
-- provider confirms the email on their own account via a 6-digit code, same
-- pattern as profile_claims. Reuses lib/claims/hash.ts (pepper-based, not
-- claim-specific despite the module name).

CREATE TABLE IF NOT EXISTS contact_verifications (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  provider_id       TEXT        NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  verification_code TEXT        NOT NULL,
  code_expires_at   TIMESTAMPTZ NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired')),
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_verifications_provider_id_idx
  ON contact_verifications (provider_id);

-- One active pending code per provider at a time (mirrors profile_claims'
-- "supersede prior pending" pattern in lib/actions/claims.ts, enforced at the
-- application layer since partial-unique-on-status needs no extra index here
-- given the low write volume).

ALTER TABLE contact_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers see own contact verifications"
  ON contact_verifications FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- Private storage bucket for CIPC/FICA documents (ID, proof of address,
-- CIPC registration docs) — kept separate from the public provider-assets
-- bucket since these are sensitive PII, not gallery/profile images. No
-- public read policy: only the uploading provider (via signed URL, checked
-- against the provider_id-prefixed path) and admins (service role) can ever
-- read these. The CIPC/FICA review pipeline that uses this bucket ships
-- separately; the bucket is created now so storage policy exists ahead of it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-verification-docs',
  'provider-verification-docs',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Providers can upload their own verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Providers can read their own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );
