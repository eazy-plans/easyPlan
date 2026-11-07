-- Make the venue-images bucket private and serve images via short-lived
-- signed URLs instead of public ones.

update storage.buckets set public = false where id = 'venue-images';

drop policy if exists "authenticated upload venue images" on storage.objects;
drop policy if exists "authenticated delete venue images" on storage.objects;
drop policy if exists "public read venue images" on storage.objects;

-- Mirrors venue_images_select: admin/secretary see every venue's images,
-- an owner only sees their own. Path convention is `${venueId}/${file}`.
create policy "venue_images_storage_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'venue-images'
    and (
      current_user_role() in ('admin', 'secretary')
      or (storage.foldername(name))[1]::uuid in (select user_venue_ids())
    )
  );

-- Mirrors venue_images_insert: admin or the owning venue_owner only.
create policy "venue_images_storage_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'venue-images'
    and (
      current_user_role() = 'admin'
      or (storage.foldername(name))[1]::uuid in (select user_venue_ids())
    )
  );

-- Mirrors venue_images_delete: admin or the owning venue_owner only.
create policy "venue_images_storage_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'venue-images'
    and (
      current_user_role() = 'admin'
      or (storage.foldername(name))[1]::uuid in (select user_venue_ids())
    )
  );
