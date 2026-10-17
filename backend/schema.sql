-- Dedicated cinema project. Apply with migration name cinema_catalogue.
-- No password, API secret, or administrator email belongs in this file.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.cinema_admins (
  email text primary key check (email = lower(btrim(email)) and position('@' in email) > 1),
  created_at timestamptz not null default now()
);
alter table public.cinema_admins enable row level security;
revoke all on public.cinema_admins from public, anon, authenticated;
-- Intentionally no client policies: allowlist maintenance is an operator-only task.

create or replace function private.is_cinema_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    join public.cinema_admins as a on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_cinema_admin() from public, anon;
grant execute on function private.is_cinema_admin() to authenticated;

create or replace function public.cinema_admin_access()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select private.is_cinema_admin(); $$;
revoke all on function public.cinema_admin_access() from public, anon;
grant execute on function public.cinema_admin_access() to authenticated;

create table if not exists public.cinema_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  synopsis text not null default '' check (char_length(synopsis) <= 4000),
  age integer not null default 0 check (age in (0, 10, 12, 14, 16, 18)),
  minutes integer not null default 1 check (minutes between 1 and 1440),
  year integer not null default extract(year from now())::integer check (year between 1888 and 2200),
  genres text[] not null default '{}' check (cardinality(genres) <= 12),
  kind text not null default 'live-action' check (kind in ('live-action', 'animation')),
  director text not null default '' check (char_length(director) <= 200),
  credit text not null default '' check (char_length(credit) <= 1000),
  video_path text not null check (video_path ~ '^video/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$'),
  image_path text check (image_path ~ '^cover/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cinema_videos enable row level security;
revoke all on public.cinema_videos from public, anon, authenticated;
grant select on public.cinema_videos to anon, authenticated;
grant insert, update, delete on public.cinema_videos to authenticated;
create index if not exists cinema_videos_status_created_idx
  on public.cinema_videos (status, created_at desc);
create index if not exists cinema_videos_published_video_idx
  on public.cinema_videos (video_path) where status = 'published';
create index if not exists cinema_videos_published_cover_idx
  on public.cinema_videos (image_path) where status = 'published';

create or replace function private.cinema_touch_updated_at()
returns trigger language plpgsql security invoker
set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function private.cinema_touch_updated_at() from public, anon, authenticated;
drop trigger if exists cinema_videos_updated_at on public.cinema_videos;
create trigger cinema_videos_updated_at before update on public.cinema_videos
  for each row execute function private.cinema_touch_updated_at();

drop policy if exists cinema_published_read on public.cinema_videos;
create policy cinema_published_read on public.cinema_videos
  for select to anon, authenticated using (status = 'published');
drop policy if exists cinema_admin_read on public.cinema_videos;
create policy cinema_admin_read on public.cinema_videos
  for select to authenticated using ((select private.is_cinema_admin()));
drop policy if exists cinema_admin_insert on public.cinema_videos;
create policy cinema_admin_insert on public.cinema_videos
  for insert to authenticated with check ((select private.is_cinema_admin()));
drop policy if exists cinema_admin_update on public.cinema_videos;
create policy cinema_admin_update on public.cinema_videos
  for update to authenticated using ((select private.is_cinema_admin()))
  with check ((select private.is_cinema_admin()));
drop policy if exists cinema_admin_delete on public.cinema_videos;
create policy cinema_admin_delete on public.cinema_videos
  for delete to authenticated using ((select private.is_cinema_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cinema-media', 'cinema-media', false, 52428800,
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- SELECT also governs signing download URLs. Draft and orphan uploads are private.
drop policy if exists cinema_media_published_read on storage.objects;
create policy cinema_media_published_read on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'cinema-media' and exists (
      select 1 from public.cinema_videos as v
      where v.status = 'published' and (v.video_path = name or v.image_path = name)
    )
  );
drop policy if exists cinema_media_admin_read on storage.objects;
create policy cinema_media_admin_read on storage.objects
  for select to authenticated using (
    bucket_id = 'cinema-media' and (select private.is_cinema_admin())
  );
drop policy if exists cinema_media_admin_insert on storage.objects;
create policy cinema_media_admin_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'cinema-media' and (select private.is_cinema_admin())
    and name ~ '^(video/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4|cover/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp))$'
  );
drop policy if exists cinema_media_admin_update on storage.objects;
create policy cinema_media_admin_update on storage.objects
  for update to authenticated using (
    bucket_id = 'cinema-media' and (select private.is_cinema_admin())
  ) with check (
    bucket_id = 'cinema-media' and (select private.is_cinema_admin())
    and name ~ '^(video/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4|cover/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp))$'
  );
drop policy if exists cinema_media_admin_delete on storage.objects;
create policy cinema_media_admin_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'cinema-media' and (select private.is_cinema_admin())
  );

-- Realtime is optional: do not create or replace an installation-wide publication.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'cinema_videos'
    ) then
    alter publication supabase_realtime add table public.cinema_videos;
  end if;
end $$;

commit;
