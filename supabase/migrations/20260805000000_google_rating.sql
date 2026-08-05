-- Google rating summary for scraped providers. Deliberately separate from
-- reviews (which are booking-linked, on-platform reviews only) so the two
-- are never conflated: google_rating/_count are display-only fields sourced
-- from Google Places, never joined into the reviews table.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS google_rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS google_rating_fetched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS providers_google_place_id_idx ON providers (google_place_id);
