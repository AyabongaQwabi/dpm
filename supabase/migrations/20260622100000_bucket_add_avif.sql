-- Add image/avif to the provider-assets bucket allowed MIME types.
UPDATE storage.buckets
SET allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'application/pdf'
]
WHERE id = 'provider-assets';
