-- YGFIT trial authentication + tenant isolation migration.
-- Existing rows are preserved in the owner's legacy studio.

begin;

create extension if not exists pgcrypto;

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.studios (id, name)
values ('00000000-0000-0000-0000-000000000001', 'YGFIT 管理工作区')
on conflict (id) do nothing;

alter table public.members add column if not exists studio_id uuid references public.studios(id) on delete cascade;
alter table public.members add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
update public.members
set studio_id = '00000000-0000-0000-0000-000000000001'
where studio_id is null;
alter table public.members alter column studio_id set not null;
create unique index if not exists idx_members_auth_user on public.members(auth_user_id) where auth_user_id is not null;
create index if not exists idx_members_studio on public.members(studio_id);

alter table public.app_configs add column if not exists studio_id uuid references public.studios(id) on delete cascade;
update public.app_configs
set studio_id = '00000000-0000-0000-0000-000000000001'
where studio_id is null;
alter table public.app_configs alter column studio_id set not null;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.app_configs'::regclass and contype = 'p'
  limit 1;
  if constraint_name is not null then
    execute format('alter table public.app_configs drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.app_configs add primary key (studio_id, key);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  role text not null check (role in ('platform_admin', 'coach', 'member')),
  studio_id uuid not null references public.studios(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_studio on public.profiles(studio_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  normalized_username text;
  requested_role text;
  assigned_role text;
  assigned_studio uuid;
  assigned_member uuid;
begin
  requested_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  normalized_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username_normalized', requested_username)));
  requested_role := coalesce(new.raw_user_meta_data ->> 'account_type', 'member');

  if length(normalized_username) < 3 or length(normalized_username) > 24 or normalized_username ~ '\s' then
    raise exception 'invalid username';
  end if;
  if requested_role not in ('coach', 'member') then
    raise exception 'invalid account type';
  end if;

  if normalized_username = 'ygfitness' then
    assigned_role := 'platform_admin';
    assigned_studio := '00000000-0000-0000-0000-000000000001';
    update public.studios set owner_user_id = new.id where id = assigned_studio;
  else
    assigned_role := requested_role;
    assigned_studio := gen_random_uuid();
    insert into public.studios (id, name, owner_user_id)
    values (
      assigned_studio,
      case when requested_role = 'coach' then requested_username || ' 的工作区' else requested_username || ' 的个人空间' end,
      new.id
    );
  end if;

  insert into public.profiles (id, username, username_normalized, role, studio_id)
  values (new.id, requested_username, normalized_username, assigned_role, assigned_studio);

  if assigned_role = 'member' then
    insert into public.members (studio_id, auth_user_id, name, avatar, join_date, gender, height_cm)
    values (
      assigned_studio,
      new.id,
      requested_username,
      'https://ui-avatars.com/api/?name=' || replace(requested_username, ' ', '+') || '&background=5856D6&color=fff',
      current_date,
      'male',
      170
    ) returning id into assigned_member;
    update public.profiles set member_id = assigned_member where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.current_studio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select studio_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select member_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_account_role()
returns text
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role = 'platform_admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.can_manage_current_studio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role in ('platform_admin', 'coach') from public.profiles where id = auth.uid()), false) $$;

revoke all on function public.current_studio_id() from public;
revoke all on function public.current_member_id() from public;
revoke all on function public.current_account_role() from public;
revoke all on function public.is_platform_admin() from public;
revoke all on function public.can_manage_current_studio() from public;
grant execute on function public.current_studio_id() to authenticated;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.current_account_role() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.can_manage_current_studio() to authenticated;

alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.workouts enable row level security;
alter table public.posture_assessments enable row level security;
alter table public.app_configs enable row level security;
alter table public.users enable row level security;

drop policy if exists "mvp_members_browser_access" on public.members;
drop policy if exists "mvp_workouts_browser_access" on public.workouts;
drop policy if exists "mvp_assessments_browser_access" on public.posture_assessments;
drop policy if exists "mvp_configs_browser_access" on public.app_configs;
drop policy if exists "mvp_users_browser_login" on public.users;

drop policy if exists studios_select on public.studios;
create policy studios_select on public.studios for select to authenticated
using (public.is_platform_admin() or id = public.current_studio_id());
drop policy if exists studios_update on public.studios;
create policy studios_update on public.studios for update to authenticated
using (public.is_platform_admin() or (id = public.current_studio_id() and public.current_account_role() = 'coach'))
with check (public.is_platform_admin() or (id = public.current_studio_id() and public.current_account_role() = 'coach'));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (public.is_platform_admin() or id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated
using (
  public.is_platform_admin()
  or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach')
  or id = public.current_member_id()
);
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
with check (studio_id = public.current_studio_id() and public.can_manage_current_studio());
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
using (
  public.is_platform_admin()
  or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach')
  or id = public.current_member_id()
)
with check (
  public.is_platform_admin()
  or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach')
  or (id = public.current_member_id() and studio_id = public.current_studio_id())
);
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
using (public.is_platform_admin() or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach'));

drop policy if exists workouts_select on public.workouts;
create policy workouts_select on public.workouts for select to authenticated
using (exists (
  select 1 from public.members m where m.id = member_id and (
    public.is_platform_admin()
    or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach')
    or m.id = public.current_member_id()
  )
));
drop policy if exists workouts_insert on public.workouts;
create policy workouts_insert on public.workouts for insert to authenticated
with check (exists (
  select 1 from public.members m where m.id = member_id and (
    public.is_platform_admin()
    or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach')
    or m.id = public.current_member_id()
  )
));
drop policy if exists workouts_update on public.workouts;
create policy workouts_update on public.workouts for update to authenticated
using (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())))
with check (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));
drop policy if exists workouts_delete on public.workouts;
create policy workouts_delete on public.workouts for delete to authenticated
using (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));

drop policy if exists assessments_select on public.posture_assessments;
create policy assessments_select on public.posture_assessments for select to authenticated
using (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));
drop policy if exists assessments_insert on public.posture_assessments;
create policy assessments_insert on public.posture_assessments for insert to authenticated
with check (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));
drop policy if exists assessments_update on public.posture_assessments;
create policy assessments_update on public.posture_assessments for update to authenticated
using (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())))
with check (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));
drop policy if exists assessments_delete on public.posture_assessments;
create policy assessments_delete on public.posture_assessments for delete to authenticated
using (exists (select 1 from public.members m where m.id = member_id and (public.is_platform_admin() or (m.studio_id = public.current_studio_id() and public.current_account_role() = 'coach') or m.id = public.current_member_id())));

drop policy if exists configs_select on public.app_configs;
create policy configs_select on public.app_configs for select to authenticated
using (public.is_platform_admin() or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach'));
drop policy if exists configs_insert on public.app_configs;
create policy configs_insert on public.app_configs for insert to authenticated
with check (studio_id = public.current_studio_id() and public.can_manage_current_studio());
drop policy if exists configs_update on public.app_configs;
create policy configs_update on public.app_configs for update to authenticated
using (public.is_platform_admin() or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach'))
with check (public.is_platform_admin() or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach'));
drop policy if exists configs_delete on public.app_configs;
create policy configs_delete on public.app_configs for delete to authenticated
using (public.is_platform_admin() or (studio_id = public.current_studio_id() and public.current_account_role() = 'coach'));

revoke all on table public.users from anon, authenticated;
revoke all on table public.studios, public.profiles, public.members, public.workouts, public.posture_assessments, public.app_configs from anon;
grant select, update on table public.studios to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.members, public.workouts, public.posture_assessments, public.app_configs to authenticated;

commit;
