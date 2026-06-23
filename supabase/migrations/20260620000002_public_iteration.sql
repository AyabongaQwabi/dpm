-- Public marketplace iteration support.
-- Adds SEO slugs, location facets, featured flags, theme metadata helpers,
-- and seed markers for clean reset scripts.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT DEFAULT 'ZA',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS providers_slug_idx ON providers (slug);
CREATE INDEX IF NOT EXISTS providers_location_city_idx ON providers (location_city);
CREATE INDEX IF NOT EXISTS providers_is_featured_idx ON providers (is_featured);
CREATE INDEX IF NOT EXISTS providers_is_seed_idx ON providers (is_seed);

ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'social',
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS content_posts_post_type_idx ON content_posts (post_type);
CREATE INDEX IF NOT EXISTS content_posts_is_seed_idx ON content_posts (is_seed);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS reviews_is_seed_idx ON reviews (is_seed);

ALTER TABLE services ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS services_is_seed_idx ON services (is_seed);

ALTER TABLE provider_categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE provider_types ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE provider_categories
SET
  description = COALESCE(description, CASE slug
    WHEN 'cleaning' THEN 'Home, office, carpet, garden, and specialist cleaning providers.'
    WHEN 'events' THEN 'Photographers, DJs, caterers, planners, decor, and event teams.'
    WHEN 'legal' THEN 'Attorneys, conveyancers, labour specialists, and legal advisors.'
    WHEN 'beauty' THEN 'Wellness, grooming, fitness, and personal care professionals.'
    WHEN 'education' THEN 'Tutors, coaches, and learning specialists for every stage.'
    WHEN 'media' THEN 'Photographers, designers, content teams, and creative studios.'
    ELSE 'Trusted local professionals and specialist service providers.'
  END),
  icon = COALESCE(icon, CASE slug
    WHEN 'cleaning' THEN 'Sparkles'
    WHEN 'events' THEN 'PartyPopper'
    WHEN 'legal' THEN 'Scale'
    WHEN 'beauty' THEN 'HeartPulse'
    WHEN 'education' THEN 'GraduationCap'
    WHEN 'media' THEN 'Camera'
    ELSE 'BriefcaseBusiness'
  END);
