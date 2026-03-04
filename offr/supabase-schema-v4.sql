-- ============================================================
-- Offr Monologue — Schema v4 incremental migration
-- Safe to run on an existing v1/v2/v3 database.
-- All statements use IF NOT EXISTS / idempotent patterns.
-- Run in Supabase SQL editor or via psql.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. profiles — new Monologue columns
-- ──────────────────────────────────────────────────────────

-- Persona: which Monologue role the student is in
alter table profiles add column if not exists persona text
  check (persona in ('EXPLORER', 'STRATEGIST', 'FINISHER'));

-- IB score breakdown (stored separately so we can show progress bars)
alter table profiles add column if not exists ib_subject_total integer;   -- sum of 6 predicted grades (max 42)
alter table profiles add column if not exists ib_bonus_points  integer default 2;  -- TOK+EE (0–3)
alter table profiles add column if not exists ib_total_points  integer;   -- ib_subject_total + ib_bonus_points, set by app

-- A-Level predicted grades as a map {subject: grade}
alter table profiles add column if not exists alevel_predicted jsonb default '{}';

-- Structured interest tags for Recommend endpoint
alter table profiles add column if not exists interest_tags text[] default '{}';

-- Fix home_or_intl to accept uppercase ('HOME'/'INTL') used by new frontend.
-- Migrate existing lowercase values, then widen the constraint.
update profiles set home_or_intl = upper(home_or_intl)
  where home_or_intl in ('home', 'intl');

do $$
begin
  -- Drop the old named check constraint if it exists
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'profiles'
      and c.conname = 'profiles_home_or_intl_check'
      and c.contype = 'c'
  ) then
    alter table profiles drop constraint profiles_home_or_intl_check;
  end if;
exception when others then null;
end $$;

-- Add a new, wider constraint (uppercase only going forward)
alter table profiles
  add constraint if not exists profiles_home_or_intl_check_v4
  check (home_or_intl in ('HOME', 'INTL', 'home', 'intl'));

-- ──────────────────────────────────────────────────────────
-- 2. strategy_choices — UCAS 5-slot strategy table
-- ──────────────────────────────────────────────────────────

create table if not exists strategy_choices (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete cascade not null,
  slot         integer     not null check (slot between 1 and 5),
  course_id    text        not null,
  university_id   text     not null,
  university_name text     not null,
  course_name  text        not null,
  degree_type  text,
  typical_offer text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id, slot)
);

alter table strategy_choices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'strategy_choices'
      and policyname = 'Users own their strategy'
  ) then
    create policy "Users own their strategy"
      on strategy_choices for all using (auth.uid() = user_id);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────
-- 3. shortlist_items — richer shortlist (replaces shortlisted_courses for new UI)
--    Supports both COURSE_GROUP (explore) and OFFERING (specific uni+course) items.
--    shortlisted_courses is kept for backward compatibility.
-- ──────────────────────────────────────────────────────────

create table if not exists shortlist_items (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete cascade not null,
  item_type         text        not null check (item_type in ('COURSE_GROUP', 'OFFERING')),
  course_group_key  text,
  course_id         text,
  course_name       text        not null,
  university_name   text,
  reason            text,
  fit_score         integer,
  created_at        timestamptz default now()
);

alter table shortlist_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'shortlist_items'
      and policyname = 'Users own their shortlist items'
  ) then
    create policy "Users own their shortlist items"
      on shortlist_items for all using (auth.uid() = user_id);
  end if;
end $$;

-- Unique per item_type: can only shortlist a given course group or offering once
create unique index if not exists shortlist_items_uniq_group
  on shortlist_items (user_id, course_group_key)
  where item_type = 'COURSE_GROUP' and course_group_key is not null;

create unique index if not exists shortlist_items_uniq_offering
  on shortlist_items (user_id, course_id)
  where item_type = 'OFFERING' and course_id is not null;

-- ──────────────────────────────────────────────────────────
-- Done.  Verify with:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'profiles' order by ordinal_position;
-- ──────────────────────────────────────────────────────────
