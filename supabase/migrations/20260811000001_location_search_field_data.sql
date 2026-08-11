-- Repurpose the old "Areas You Service" field (f-service-areas) into a real
-- nationwide location field. Existing provider_field_values rows referencing
-- this field_id are stale 25-city selections — they're dropped since the
-- field now expects a single city string written to providers.location_city
-- (see saveOnboardingStep's PROVIDER_COLUMN_KEYS), not a multi-select array.
DELETE FROM provider_field_values WHERE field_id = 'f-service-areas';

UPDATE fields
SET
  key = 'location_city',
  label = 'Location / City',
  input_type = 'location_search',
  options = NULL
WHERE id = 'f-service-areas';
