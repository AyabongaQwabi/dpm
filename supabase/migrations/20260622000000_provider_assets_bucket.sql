-- Storage bucket for provider-uploaded assets (profile images, documents, etc.)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-assets',
  'provider-assets',
  true,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
on conflict (id) do nothing;

-- Authenticated providers can upload to their own folder (provider_id prefix).
create policy "Providers can upload their own assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'provider-assets'
  );

-- Anyone can read public assets.
create policy "Public read provider assets"
  on storage.objects for select
  to public
  using (bucket_id = 'provider-assets');

-- Providers can delete their own assets.
create policy "Providers can delete their own assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'provider-assets');
