-- Additive migration: cinema_library_sync. No privileged client credentials.
begin;
create or replace function private.valid_cinema_library(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare profile jsonb;
begin
  if valid_cinema_library.value is null or jsonb_typeof(valid_cinema_library.value) <> 'object'
    or octet_length(valid_cinema_library.value::text) > 524288
    or valid_cinema_library.value->'version' is distinct from '1'::jsonb
    or jsonb_typeof(valid_cinema_library.value->'profiles') is distinct from 'array'
    or jsonb_typeof(valid_cinema_library.value->'activeProfileId') is distinct from 'string' then return false; end if;
  if jsonb_array_length(valid_cinema_library.value->'profiles') not between 1 and 5 then return false; end if;
  for profile in select * from jsonb_array_elements(valid_cinema_library.value->'profiles') loop
    if jsonb_typeof(profile) <> 'object'
      or jsonb_typeof(profile->'id') is distinct from 'string'
      or char_length(profile->>'id') not between 1 and 256
      or jsonb_typeof(profile->'name') is distinct from 'string'
      or char_length(btrim(profile->>'name')) not between 1 and 24
      or coalesce(profile->>'color', '') not in ('red','blue','teal','gold','violet')
      or jsonb_typeof(profile->'kids') is distinct from 'boolean'
      or jsonb_typeof(profile->'savedIds') is distinct from 'array'
      or jsonb_typeof(profile->'readNotices') is distinct from 'array'
      or jsonb_typeof(profile->'ratings') is distinct from 'object'
      or jsonb_typeof(profile->'progress') is distinct from 'object'
      or jsonb_typeof(profile->'preferences') is distinct from 'object' then return false; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(valid_cinema_library.value->'profiles')) <>
    (select count(distinct p->>'id') from jsonb_array_elements(valid_cinema_library.value->'profiles') p)
    then return false; end if;
  return exists(select 1 from jsonb_array_elements(valid_cinema_library.value->'profiles') p
    where p->>'id' = valid_cinema_library.value->>'activeProfileId');
end; $$;
revoke all on function private.valid_cinema_library(jsonb) from public, anon;
grant execute on function private.valid_cinema_library(jsonb) to authenticated;

create table if not exists public.cinema_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (private.valid_cinema_library(state)),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now()
);
alter table public.cinema_libraries enable row level security;
revoke all on public.cinema_libraries from public, anon, authenticated;
grant select, insert, update on public.cinema_libraries to authenticated;
drop policy if exists cinema_library_owner_read on public.cinema_libraries;
create policy cinema_library_owner_read on public.cinema_libraries
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists cinema_library_owner_insert on public.cinema_libraries;
create policy cinema_library_owner_insert on public.cinema_libraries
  for insert to authenticated with check (user_id = (select auth.uid()) and revision = 1);
drop policy if exists cinema_library_owner_update on public.cinema_libraries;
create policy cinema_library_owner_update on public.cinema_libraries
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function private.cinema_library_revision()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin
  if new.user_id is distinct from old.user_id or new.revision <> old.revision + 1 then
    raise exception 'Revisão da biblioteca inválida' using errcode = '23514';
  end if;
  new.updated_at = now();
  return new;
end; $$;
revoke all on function private.cinema_library_revision() from public, anon, authenticated;
drop trigger if exists cinema_library_revision on public.cinema_libraries;
create trigger cinema_library_revision before update on public.cinema_libraries
  for each row execute function private.cinema_library_revision();
commit;
