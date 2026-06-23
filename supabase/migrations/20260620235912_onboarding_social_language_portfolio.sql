-- =============================================================================
-- Onboarding steps: Social Links (step 4), Languages (step 5), Portfolio (step 6)
--
-- These are fixed-column steps — they write directly to social_links / languages /
-- portfolio on the providers table (already added in the v2 migration), not through
-- the dynamic field_values system. The form_configs rows here are placeholders that
-- the resolveStepSequence logic picks up; there are no form_config_fields rows because
-- the onboarding page renders custom UI for these steps identified by step_number.
-- =============================================================================

INSERT INTO form_configs (id, provider_type_id, category_id, step_number, step_title) VALUES
  ('fc-events-4',    NULL, 'cat-events',    4, 'Social Links'),
  ('fc-events-5',    NULL, 'cat-events',    5, 'Languages'),
  ('fc-events-6',    NULL, 'cat-events',    6, 'Portfolio'),
  ('fc-cleaning-4',  NULL, 'cat-cleaning',  4, 'Social Links'),
  ('fc-cleaning-5',  NULL, 'cat-cleaning',  5, 'Languages'),
  ('fc-cleaning-6',  NULL, 'cat-cleaning',  6, 'Portfolio'),
  ('fc-security-4',  NULL, 'cat-security',  4, 'Social Links'),
  ('fc-security-5',  NULL, 'cat-security',  5, 'Languages'),
  ('fc-security-6',  NULL, 'cat-security',  6, 'Portfolio'),
  ('fc-home-4',      NULL, 'cat-home',      4, 'Social Links'),
  ('fc-home-5',      NULL, 'cat-home',      5, 'Languages'),
  ('fc-home-6',      NULL, 'cat-home',      6, 'Portfolio'),
  ('fc-auto-4',      NULL, 'cat-auto',      4, 'Social Links'),
  ('fc-auto-5',      NULL, 'cat-auto',      5, 'Languages'),
  ('fc-auto-6',      NULL, 'cat-auto',      6, 'Portfolio'),
  ('fc-beauty-4',    NULL, 'cat-beauty',    4, 'Social Links'),
  ('fc-beauty-5',    NULL, 'cat-beauty',    5, 'Languages'),
  ('fc-beauty-6',    NULL, 'cat-beauty',    6, 'Portfolio'),
  ('fc-legal-4',     NULL, 'cat-legal',     4, 'Social Links'),
  ('fc-legal-5',     NULL, 'cat-legal',     5, 'Languages'),
  ('fc-legal-6',     NULL, 'cat-legal',     6, 'Portfolio'),
  ('fc-finance-4',   NULL, 'cat-finance',   4, 'Social Links'),
  ('fc-finance-5',   NULL, 'cat-finance',   5, 'Languages'),
  ('fc-finance-6',   NULL, 'cat-finance',   6, 'Portfolio'),
  ('fc-health-4',    NULL, 'cat-health',    4, 'Social Links'),
  ('fc-health-5',    NULL, 'cat-health',    5, 'Languages'),
  ('fc-health-6',    NULL, 'cat-health',    6, 'Portfolio'),
  ('fc-edu-4',       NULL, 'cat-education', 4, 'Social Links'),
  ('fc-edu-5',       NULL, 'cat-education', 5, 'Languages'),
  ('fc-edu-6',       NULL, 'cat-education', 6, 'Portfolio'),
  ('fc-pets-4',      NULL, 'cat-pets',      4, 'Social Links'),
  ('fc-pets-5',      NULL, 'cat-pets',      5, 'Languages'),
  ('fc-pets-6',      NULL, 'cat-pets',      6, 'Portfolio'),
  ('fc-transport-4', NULL, 'cat-transport', 4, 'Social Links'),
  ('fc-transport-5', NULL, 'cat-transport', 5, 'Languages'),
  ('fc-transport-6', NULL, 'cat-transport', 6, 'Portfolio'),
  ('fc-property-4',  NULL, 'cat-property',  4, 'Social Links'),
  ('fc-property-5',  NULL, 'cat-property',  5, 'Languages'),
  ('fc-property-6',  NULL, 'cat-property',  6, 'Portfolio'),
  ('fc-tech-4',      NULL, 'cat-tech',      4, 'Social Links'),
  ('fc-tech-5',      NULL, 'cat-tech',      5, 'Languages'),
  ('fc-tech-6',      NULL, 'cat-tech',      6, 'Portfolio'),
  ('fc-media-4',     NULL, 'cat-media',     4, 'Social Links'),
  ('fc-media-5',     NULL, 'cat-media',     5, 'Languages'),
  ('fc-media-6',     NULL, 'cat-media',     6, 'Portfolio')
ON CONFLICT (id) DO NOTHING;
