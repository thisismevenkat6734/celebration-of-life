-- =====================================================
-- COL | SECURE STORAGE SETUP
-- =====================================================

-- 1. Create storage buckets

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
(
  'col-avatars',
  'col-avatars',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
),
(
  'col-post-media',
  'col-post-media',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Avatar policies

create policy "Public avatar access"
on storage.objects
for select
to public
using (
  bucket_id = 'col-avatars'
);

create policy "Users upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'col-avatars'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
);

create policy "Users update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'col-avatars'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
)
with check (
  bucket_id = 'col-avatars'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
);

create policy "Users delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'col-avatars'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
);

-- 3. Private post media upload

create policy "Users upload own post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'col-post-media'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
  and exists (
    select 1
    from public.posts p
    where p.id::text =
          (storage.foldername(name))[2]
      and p.user_id = (select auth.uid())
  )
);

-- 4. Private post media viewing

create policy "Users view permitted post media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'col-post-media'
  and exists (
    select 1
    from public.post_media pm
    where pm.storage_path = name
      and public.can_view_post(pm.post_id)
  )
);

-- 5. Owners delete their own post media

create policy "Owners delete own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'col-post-media'
  and (storage.foldername(name))[1] =
      (select auth.uid())::text
  and exists (
    select 1
    from public.posts p
    where p.id::text =
          (storage.foldername(name))[2]
      and p.user_id = (select auth.uid())
  )
);

-- =====================================================
-- END OF COL STORAGE SETUP
-- =====================================================
