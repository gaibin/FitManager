-- ============================================================
-- Supabase 免费版防回收「心跳表」
-- 作用：每天由 keepalive 脚本 upsert 一行，制造数据库写请求，
--       使项目始终处于“活跃”状态，不会被 Supabase 因 7 天无活动而暂停/回收。
-- 使用：在 Supabase 控制台 -> SQL Editor 中「一次性」执行本文件即可。
-- ============================================================

create table if not exists public.heartbeats (
  id          int         primary key default 1,
  last_ping   timestamptz not null default now(),
  ping_count  bigint      not null default 1,
  updated_at  timestamptz not null default now()
);

-- 启用行级安全（与项目现有风格一致），并放行 anon/authenticated 的读写，
-- 这样保活脚本即使用前端同款 anon key 也能写入，无需暴露 service_role 密钥。
alter table public.heartbeats enable row level security;

drop policy if exists "heartbeats_anon_access" on public.heartbeats;
create policy "heartbeats_anon_access" on public.heartbeats
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update on table public.heartbeats to anon, authenticated;
