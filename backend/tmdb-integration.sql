-- Additive migration: cinema_tmdb_integration. Contains no provider credential.
begin;
create table if not exists private.cinema_integrations (
  id text primary key check (id = 'tmdb'),
  token text not null check (char_length(token) between 1 and 512 and token ~ '^[A-Za-z0-9._-]+$'),
  updated_at timestamptz not null default now()
);
alter table private.cinema_integrations enable row level security;
revoke all on private.cinema_integrations from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.cinema_integrations to service_role;

create or replace function private.configure_cinema_tmdb(p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $$ begin
  if (select auth.uid()) is null or not private.is_cinema_admin() then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if p_token is null then
    delete from private.cinema_integrations where id = 'tmdb';
    return false;
  end if;
  if char_length(p_token) not between 1 and 512 or p_token !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'Credencial inválida' using errcode = '22023';
  end if;
  insert into private.cinema_integrations(id, token) values ('tmdb', p_token)
  on conflict (id) do update set token = excluded.token, updated_at = now();
  return true;
end; $$;
revoke all on function private.configure_cinema_tmdb(text) from public, anon;
grant execute on function private.configure_cinema_tmdb(text) to authenticated;

create or replace function public.cinema_configure_tmdb(p_token text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.configure_cinema_tmdb(p_token); $$;
revoke all on function public.cinema_configure_tmdb(text) from public, anon;
grant execute on function public.cinema_configure_tmdb(text) to authenticated;

create or replace function public.cinema_metadata_secret()
returns text language sql stable security invoker set search_path = ''
as $$ select token from private.cinema_integrations where id = 'tmdb'; $$;
revoke all on function public.cinema_metadata_secret() from public, anon, authenticated;
grant execute on function public.cinema_metadata_secret() to service_role;
commit;
