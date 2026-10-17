-- Additive migration: cinema_public_viewing.
-- Public discovery/playback; account libraries and administrator writes stay private.
begin;

drop policy if exists cinema_published_read on public.cinema_videos;
create policy cinema_published_read on public.cinema_videos
  for select to anon, authenticated using (status = 'published');

drop policy if exists cinema_media_published_read on storage.objects;
create policy cinema_media_published_read on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'cinema-media' and exists (
      select 1 from public.cinema_videos as v
      where v.status = 'published'
        and (v.video_path = storage.objects.name or v.image_path = storage.objects.name)
    )
  );

-- No blanket public-bucket access, write grants, admin or library policy changes.
-- Drafts and unreferenced Storage objects remain private.
commit;
