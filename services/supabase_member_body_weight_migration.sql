-- Member profile and daily body-weight support.
-- Safe to run more than once on an existing NeonFit database.

alter table public.members
  add column if not exists weight_kg numeric;

alter table public.workouts
  add column if not exists body_weight_kg numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_weight_kg_range') then
    alter table public.members
      add constraint members_weight_kg_range
      check (weight_kg is null or (weight_kg >= 25 and weight_kg <= 300));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workouts_body_weight_kg_range') then
    alter table public.workouts
      add constraint workouts_body_weight_kg_range
      check (body_weight_kg is null or (body_weight_kg >= 25 and body_weight_kg <= 300));
  end if;
end $$;

comment on column public.members.weight_kg is 'Baseline/profile body weight in kilograms';
comment on column public.workouts.body_weight_kg is 'Member body weight recorded for this training date; distinct from exercise load';
