-- Additive follow-up to backend/schema.sql, migration name cinema_drive_links.
-- Existing upload records remain uploads. No remote access or Drive API calls.
begin;

alter table public.cinema_videos
  add column if not exists video_source text not null default 'upload',
  add column if not exists drive_url text;

-- The original video_path format CHECK remains effective for non-NULL paths.
alter table public.cinema_videos alter column video_path drop not null;

alter table public.cinema_videos
  drop constraint if exists cinema_videos_video_source_check;
alter table public.cinema_videos
  add constraint cinema_videos_video_source_check
  check (video_source in ('upload', 'drive'));

alter table public.cinema_videos
  drop constraint if exists cinema_videos_video_source_fields_check;
alter table public.cinema_videos
  add constraint cinema_videos_video_source_fields_check check (
    (
      video_source = 'upload'
      and video_path is not null
      and drive_url is null
    )
    or
    (
      video_source = 'drive'
      and video_path is null
      and drive_url is not null
      and drive_url ~ '^https://drive[.]google[.]com/file/d/[A-Za-z0-9_-]{10,200}/view([?]resourcekey=[A-Za-z0-9_-]{1,200})?$'
    )
  );

comment on column public.cinema_videos.video_source is
  'upload: private cinema-media object; drive: manually supplied public Google Drive file link';
comment on column public.cinema_videos.drive_url is
  'Canonical HTTPS drive.google.com/file/d/ID/view link, optional resourcekey only; NULL for upload';

-- No RLS, grants, authentication, Storage bucket or publication changes.
-- Published Drive rows may still reference their cover in private Storage.
commit;
