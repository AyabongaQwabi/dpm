-- Replace the fake "Areas You Service" 25-city checkbox picker with a real
-- nationwide location field backed by Google Places Autocomplete, writing to
-- providers.location_city (the column search/slug generation already read
-- from, but which no signup flow ever populated).
--
-- ALTER TYPE ... ADD VALUE must run before it's referenced by later
-- statements in the same migration — kept as its own top-level statement.
ALTER TYPE input_type ADD VALUE IF NOT EXISTS 'location_search';
