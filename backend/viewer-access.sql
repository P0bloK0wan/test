-- Additive migration: cinema_viewer_access.
-- Require a viewer session for shared catalogue rows and private Storage media.
-- Keep administrator authorization, confirmation and allowlist unchanged.
begin;

drop policy if exists cinema_published_read on public.cinema_videos;
create policy cinema_published_read on public.cinema_videos
  for select to authenticated using (status = 'published');

drop policy if exists cinema_media_published_read on storage.objects;
create policy cinema_media_published_read on storage.objects
  for select to authenticated using (
    bucket_id = 'cinema-media' and exists (
      select 1 from public.cinema_videos as v
      where v.status = 'published'
        and (v.video_path = storage.objects.name or v.image_path = storage.objects.name)
    )
  );

-- No policy grants anon catalogue or media reads. Existing SELECT table grants
-- alone reveal no rows under RLS. Service-role/operator access remains privileged.
commit;
