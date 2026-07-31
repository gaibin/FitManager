-- Secure Supabase keep-alive. Run once in SQL Editor.
-- GitHub Actions calls the fixed RPC with anon key; anon/authenticated
-- cannot write the heartbeat table directly.

create table if not exists public.heartbeats (
  id int primary key default 1,
  last_ping timestamptz not null default now(),
  ping_count bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.heartbeats enable row level security;
revoke all on table public.heartbeats from anon, authenticated;

create or replace function public.keepalive_ping()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.heartbeats;
begin
  insert into public.heartbeats (id, last_ping, ping_count, updated_at)
  values (1, now(), 1, now())
  on conflict (id) do update
    set last_ping = excluded.last_ping,
        ping_count = public.heartbeats.ping_count + 1,
        updated_at = excluded.updated_at
  returning * into result;

  return jsonb_build_object('last_ping', result.last_ping, 'ping_count', result.ping_count);
end;
$$;

revoke all on function public.keepalive_ping() from public;
grant execute on function public.keepalive_ping() to anon, authenticated;
