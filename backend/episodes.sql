-- Additive migration: cinema_episodes. Optional metadata, no access-policy changes.
begin;

alter table public.cinema_videos
  add column if not exists series_title text,
  add column if not exists season integer,
  add column if not exists episode integer,
  add column if not exists episode_title text;

alter table public.cinema_videos
  drop constraint if exists cinema_videos_episode_metadata_check;
alter table public.cinema_videos
  add constraint cinema_videos_episode_metadata_check check (
    num_nonnulls(series_title, season, episode) in (0, 3)
    and (series_title is null or (
      char_length(series_title) between 1 and 160
      and series_title = btrim(series_title)
    ))
    and (season is null or season between 1 and 100)
    and (episode is null or episode between 1 and 10000)
    and (episode_title is null or char_length(episode_title) <= 160)
  );

create unique index if not exists cinema_videos_series_episode_unique_idx
  on public.cinema_videos (lower(series_title), season, episode)
  where series_title is not null;

comment on column public.cinema_videos.series_title is
  'Optional series name, trimmed; requires season and episode when present';
comment on column public.cinema_videos.season is
  'Optional season number 1..100; set together with series_title and episode';
comment on column public.cinema_videos.episode is
  'Optional episode number 1..10000; unique per case-insensitive series and season';
comment on column public.cinema_videos.episode_title is
  'Optional episode subtitle, up to 160 characters';

commit;
