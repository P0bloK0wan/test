-- Fix ambiguous parameter references exposed by real PostgreSQL integration test.
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
