-- =============================================================================
-- Feature requests
-- =============================================================================
--
-- Public feature-request inbox. Values below mirror config/feature-requests.json:
-- role/area/status option sets, text length caps, and the rate-limit window
-- used in application code. Keep both files aligned when changing this feature.
--
-- POPIA: raw IP addresses are never stored. Application code hashes the client
-- IP with FEATURE_REQUEST_IP_HASH_SALT and writes only ip_hash.

CREATE TYPE feature_request_submitter_role AS ENUM ('customer', 'provider', 'agent', 'other');
CREATE TYPE feature_request_area AS ENUM ('search', 'profile', 'payments', 'messaging', 'reviews', 'mobile', 'other');
CREATE TYPE feature_request_status AS ENUM ('new', 'triaged', 'planned', 'in_progress', 'shipped', 'declined');

CREATE TABLE feature_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  submitter_role  feature_request_submitter_role NOT NULL,
  area            feature_request_area NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  status          feature_request_status NOT NULL DEFAULT 'new',
  admin_notes     TEXT,
  vote_count      INTEGER NOT NULL DEFAULT 0,
  source_path     TEXT,
  user_agent      TEXT,
  ip_hash         TEXT,

  CONSTRAINT feature_requests_name_len CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT feature_requests_email_len CHECK (char_length(email) BETWEEN 1 AND 254),
  CONSTRAINT feature_requests_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT feature_requests_description_len CHECK (char_length(description) BETWEEN 1 AND 2000),
  CONSTRAINT feature_requests_vote_count_nonnegative CHECK (vote_count >= 0)
);

CREATE INDEX feature_requests_status_idx ON feature_requests (status);
CREATE INDEX feature_requests_created_at_idx ON feature_requests (created_at DESC);
CREATE INDEX feature_requests_ip_hash_idx ON feature_requests (ip_hash);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit feature requests"
  ON feature_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies: normal anon/authenticated clients cannot
-- read or mutate submissions. Service-role server code bypasses RLS for admin
-- operations and email/rate-limit handling.
