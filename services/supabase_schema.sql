-- YGFIT Studio production schema (legacy bootstrap).
-- For the current username/password + tenant-isolated trial, run this file
-- first on a blank project, then run supabase_auth_tenant_migration.sql.
-- Run this once in the new Supabase project's SQL Editor.
--
-- The current frontend still uses its legacy browser login rather than
-- Supabase Auth. The temporary browser-access policies below keep the MVP
-- functional; replace them with Supabase Auth + member-scoped RLS before
-- opening the project to untrusted users.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text,
  join_date date not null default current_date,
  photo_url text,
  gender text not null default 'male' check (gender in ('male', 'female')),
  height_cm numeric not null default 170,
  weight_kg numeric check (weight_kg is null or (weight_kg >= 25 and weight_kg <= 300)),
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null default current_date,
  exercise text not null,
  weight numeric not null default 0,
  sets integer not null default 0,
  reps integer not null default 0,
  duration_seconds integer,
  rpe numeric,
  completed boolean,
  note text,
  body_weight_kg numeric check (body_weight_kg is null or (body_weight_kg >= 25 and body_weight_kg <= 300)),
  created_at timestamptz not null default now()
);

create table if not exists public.posture_assessments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  assessment_date date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (member_id, assessment_date)
);

create table if not exists public.app_configs (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'member')),
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workouts_member_date
  on public.workouts (member_id, date desc);
create index if not exists idx_assessments_member_date
  on public.posture_assessments (member_id, assessment_date desc);
create index if not exists idx_users_username
  on public.users (username);

alter table public.members enable row level security;
alter table public.workouts enable row level security;
alter table public.posture_assessments enable row level security;
alter table public.app_configs enable row level security;
alter table public.users enable row level security;

drop policy if exists "mvp_members_browser_access" on public.members;
create policy "mvp_members_browser_access" on public.members
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_workouts_browser_access" on public.workouts;
create policy "mvp_workouts_browser_access" on public.workouts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_assessments_browser_access" on public.posture_assessments;
create policy "mvp_assessments_browser_access" on public.posture_assessments
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_configs_browser_access" on public.app_configs;
create policy "mvp_configs_browser_access" on public.app_configs
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_users_browser_login" on public.users;
create policy "mvp_users_browser_login" on public.users
  for select to anon, authenticated using (true);

-- RLS policies decide which rows are accessible; table grants are still
-- required for PostgREST browser clients to perform the operations.
grant select, insert, update, delete on table
  public.members,
  public.workouts,
  public.posture_assessments,
  public.app_configs
to anon, authenticated;

grant select on table public.users to anon, authenticated;
