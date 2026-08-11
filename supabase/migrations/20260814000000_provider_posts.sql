-- =============================================================================
-- Provider posts & stories
-- =============================================================================
--
-- Extends the existing content_posts table (PRD Section 13's social feed,
-- zero live rows at the time of this migration — confirmed before writing)
-- rather than creating a parallel table, per direction: provider_posts and
-- content_posts are the same underlying concept, a table of posts created by
-- providers.
--
-- Publishing is free for every provider. Pro only raises the caps
-- (pro.publishing_limits) — nothing in this schema gates who can insert a row.

CREATE TYPE content_post_kind AS ENUM ('post', 'story');
CREATE TYPE content_post_status AS ENUM ('draft', 'published', 'expired', 'removed');
CREATE TYPE content_post_moderation_status AS ENUM ('passed', 'flagged', 'removed');

ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS kind               content_post_kind NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS title              TEXT,
  ADD COLUMN IF NOT EXISTS slug               TEXT,
  ADD COLUMN IF NOT EXISTS media              JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS status             content_post_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS published_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_status  content_post_moderation_status NOT NULL DEFAULT 'passed',
  ADD COLUMN IF NOT EXISTS moderation_notes   TEXT,
  ADD COLUMN IF NOT EXISTS view_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- kind check constraints mirror the spec's `post` vs `story` shape rules:
-- posts require a title + slug, stories must not have either.
ALTER TABLE content_posts
  ADD CONSTRAINT content_posts_post_requires_title_slug
    CHECK (kind = 'story' OR (title IS NOT NULL AND slug IS NOT NULL)),
  ADD CONSTRAINT content_posts_story_forbids_title_slug
    CHECK (kind = 'post' OR (title IS NULL AND slug IS NULL)),
  ADD CONSTRAINT content_posts_story_requires_expiry
    CHECK (kind = 'post' OR status != 'published' OR expires_at IS NOT NULL);

-- Slug unique per provider (not globally — two providers can each have a
-- "kitchen-renovation-tips" post at their own /providers/[slug]/posts/[postSlug]).
CREATE UNIQUE INDEX content_posts_provider_slug_unique
  ON content_posts (provider_id, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX content_posts_provider_kind_status_idx
  ON content_posts (provider_id, kind, status);
CREATE INDEX content_posts_published_at_idx
  ON content_posts (published_at DESC);
CREATE INDEX content_posts_expires_at_idx
  ON content_posts (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TRIGGER content_posts_set_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads published passed-moderation posts"
  ON content_posts FOR SELECT
  USING (status = 'published' AND moderation_status = 'passed');

CREATE POLICY "providers read all own posts"
  ON content_posts FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_provider_id = auth.uid()::TEXT
    )
  );

-- Writes are service-role only (server actions use createAdminClient()),
-- matching the convention used by pro_memberships / sponsored_placements —
-- no direct-from-browser insert/update/delete policy is created.

-- ---------------------------------------------------------------------------
-- platform_config seeds — publishing limits (free tier is the default)
-- ---------------------------------------------------------------------------

INSERT INTO platform_config (key, value, description) VALUES
  ('publishing_free_posts_per_month', '2', 'TODO(aya): confirm — free-tier posts per rolling month'),
  ('publishing_free_stories_live', '1', 'TODO(aya): confirm — free-tier stories live at once'),
  ('publishing_free_images_per_post', '1', 'TODO(aya): confirm — free-tier images per post'),
  ('publishing_free_body_max_chars', '1500', 'TODO(aya): confirm — free-tier body length cap'),
  ('publishing_pro_posts_per_month', '20', 'TODO(aya): confirm — Pro posts per rolling month'),
  ('publishing_pro_stories_live', '5', 'TODO(aya): confirm — Pro stories live at once'),
  ('publishing_pro_images_per_post', '10', 'TODO(aya): confirm — Pro images per post'),
  ('publishing_pro_body_max_chars', '5000', 'TODO(aya): confirm — Pro body length cap'),
  ('publishing_expired_story_media_retention_days', '30', 'TODO(aya): confirm — how long expired story media is kept before purge')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Reporting — no existing mechanism found anywhere in the repo (confirmed:
-- no moderation/report/flag/abuse table, no admin review queue). New table.
-- ---------------------------------------------------------------------------

CREATE TYPE content_report_status AS ENUM ('open', 'reviewed', 'dismissed');

CREATE TABLE content_post_reports (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  post_id       TEXT NOT NULL REFERENCES content_posts (id) ON DELETE CASCADE,
  reporter_ip_hash TEXT, -- no auth required to report; hashed for basic abuse throttling, not identity
  reason        TEXT NOT NULL,
  status        content_report_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX content_post_reports_post_id_idx ON content_post_reports (post_id);
CREATE INDEX content_post_reports_status_idx ON content_post_reports (status) WHERE status = 'open';

ALTER TABLE content_post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can file a report"
  ON content_post_reports FOR INSERT
  WITH CHECK (true);

-- No SELECT policy for anon/authenticated — reports are read via
-- createAdminClient() only (future admin review queue, per the spec's
-- moderation_notes column being explicitly "for the future admin platform").

-- ---------------------------------------------------------------------------
-- RPC: increment_post_view_count — single-column atomic increment, called
-- best-effort (fire-and-forget) from the public post page.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_post_view_count(p_post_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE content_posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;
