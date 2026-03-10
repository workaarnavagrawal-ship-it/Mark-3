-- ═══════════════════════════════════════════════════════════════
-- Offr v2 – Supabase Schema Migration (idempotent)
-- Run in Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ─── A) PROFILES ─────────────────────────────────────────────
-- Existing table: profiles. Add new columns required by spec.
-- Old columns (year, core_points, ps_format, ps_q1..q3, ps_statement, ps_last_analysis)
-- are kept for backward compat but will be superseded by new tables.

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null default '',
  curriculum text not null default 'IB' check (curriculum in ('IB', 'ALEVEL', 'A_LEVELS')),
  home_or_intl text not null default 'INTL' check (home_or_intl in ('HOME', 'INTL', 'home', 'intl')),
  interests text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- New columns for spec
alter table profiles add column if not exists persona text;
alter table profiles add column if not exists predicted_summary text;
alter table profiles add column if not exists ib_subject_total integer;
alter table profiles add column if not exists ib_bonus_points integer;
alter table profiles add column if not exists ib_total_points integer;
alter table profiles add column if not exists alevel_predicted jsonb;
alter table profiles add column if not exists interest_tags text[] default '{}';

-- Rename interests -> interest_tags handled by keeping both columns alive
-- (interest_tags is the new canonical column; interests kept for compat)

-- Make legacy columns nullable (onboarding no longer collects year/core_points)
alter table profiles alter column year drop not null;
alter table profiles alter column year set default '12';
alter table profiles alter column core_points drop not null;
alter table profiles alter column name set default '';

-- Relax constraints if they exist from old schema
-- (persona can be null during onboarding step 1-3)
do $$
begin
  -- Drop old check constraints that conflict with new values
  begin
    alter table profiles drop constraint if exists profiles_curriculum_check;
  exception when others then null;
  end;
  begin
    alter table profiles drop constraint if exists profiles_home_or_intl_check;
  exception when others then null;
  end;
  begin
    alter table profiles drop constraint if exists profiles_year_check;
  exception when others then null;
  end;
end $$;

-- Add updated constraints
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_curriculum_check_v2'
  ) then
    alter table profiles add constraint profiles_curriculum_check_v2
      check (curriculum in ('IB', 'ALEVEL', 'A_LEVELS'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_home_or_intl_check_v2'
  ) then
    alter table profiles add constraint profiles_home_or_intl_check_v2
      check (home_or_intl in ('HOME', 'INTL', 'home', 'intl'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_persona_check'
  ) then
    alter table profiles add constraint profiles_persona_check
      check (persona is null or persona in ('EXPLORER', 'STRATEGIST', 'FINISHER'));
  end if;
end $$;

-- Index
create index if not exists idx_profiles_user_id on profiles(user_id);


-- ─── B) MY_SPACE_RUNS ───────────────────────────────────────
-- Explorer clarity sessions

create table if not exists my_space_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  prefs jsonb not null default '{}',
  results_snapshot jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_my_space_runs_user_id on my_space_runs(user_id);
create index if not exists idx_my_space_runs_created on my_space_runs(user_id, created_at desc);

alter table my_space_runs enable row level security;

-- RLS: users own their runs
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'my_space_runs' and policyname = 'Users own their runs'
  ) then
    create policy "Users own their runs" on my_space_runs
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── C) SHORTLIST_ITEMS ─────────────────────────────────────
-- Replaces shortlisted_courses. Supports both course groups and specific offerings.

create table if not exists shortlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_type text not null default 'OFFERING' check (item_type in ('COURSE_GROUP', 'OFFERING')),
  course_group_key text,
  course_id text,
  course_name text not null,
  university_name text,
  reason text,
  fit_score integer,
  created_at timestamptz default now()
);

-- Unique constraints with partial indexes
create unique index if not exists idx_shortlist_items_course_id
  on shortlist_items(user_id, course_id)
  where course_id is not null;

create unique index if not exists idx_shortlist_items_course_group
  on shortlist_items(user_id, course_group_key)
  where course_group_key is not null;

create index if not exists idx_shortlist_items_user_id on shortlist_items(user_id);

alter table shortlist_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'shortlist_items' and policyname = 'Users own their shortlist'
  ) then
    create policy "Users own their shortlist" on shortlist_items
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── D) STRATEGY_CHOICES ────────────────────────────────────
-- UCAS 5 choices workspace

create table if not exists strategy_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slot integer not null check (slot >= 1 and slot <= 5),
  course_id text not null,
  university_name text not null,
  course_name text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_strategy_choices_slot
  on strategy_choices(user_id, slot);

create index if not exists idx_strategy_choices_user_id on strategy_choices(user_id);

alter table strategy_choices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'strategy_choices' and policyname = 'Users own their strategy'
  ) then
    create policy "Users own their strategy" on strategy_choices
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── E) PS_DOCUMENTS ────────────────────────────────────────
-- Personal statement drafts (separate from profiles)

create table if not exists ps_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'UCAS_2026' check (mode in ('UCAS_2026', 'FREEFORM')),
  q1 text,
  q2 text,
  q3 text,
  freeform text,
  last_analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ps_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'ps_documents' and policyname = 'Users own their ps'
  ) then
    create policy "Users own their ps" on ps_documents
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── F) PS_ANALYSIS_RESULTS ─────────────────────────────────
-- Stored PS analysis outputs

create table if not exists ps_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  target_course text not null,
  target_university text,
  ps_band text not null,
  score integer not null,
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_ps_analysis_user_id on ps_analysis_results(user_id);
create index if not exists idx_ps_analysis_created on ps_analysis_results(user_id, created_at desc);

alter table ps_analysis_results enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'ps_analysis_results' and policyname = 'Users own their ps analysis'
  ) then
    create policy "Users own their ps analysis" on ps_analysis_results
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── G) ASSESSMENTS (update existing) ───────────────────────
-- Add new columns to existing assessments table

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id text not null,
  course_name text not null,
  university_id text,
  university_name text not null,
  band text not null,
  chance_percent integer not null,
  result_json jsonb not null default '{}',
  label text,
  created_at timestamptz default now()
);

-- New columns per spec
alter table assessments add column if not exists fit_score integer;
alter table assessments add column if not exists grade_match integer;
alter table assessments add column if not exists ps_impact integer;
alter table assessments add column if not exists reasoning jsonb;

-- Rename chance_percent -> chance (keep both for compat)
alter table assessments add column if not exists chance integer;

-- Update band constraint to match spec values
do $$
begin
  begin
    alter table assessments drop constraint if exists assessments_band_check;
  exception when others then null;
  end;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assessments_band_check_v2'
  ) then
    alter table assessments add constraint assessments_band_check_v2
      check (band in ('SAFE', 'TARGET', 'REACH', 'Safe', 'Target', 'Reach'));
  end if;
end $$;

create index if not exists idx_assessments_user_id on assessments(user_id);
create index if not exists idx_assessments_course on assessments(user_id, course_id);

alter table assessments enable row level security;

-- RLS policy (idempotent check)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'assessments' and policyname = 'Users own their assessments'
  ) then
    create policy "Users own their assessments" on assessments
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


-- ─── EXISTING TABLES: RLS (idempotent) ──────────────────────

alter table profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users own their profile v2'
  ) then
    create policy "Users own their profile v2" on profiles
      for all using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- subjects table (keep existing)
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  level text not null,
  predicted_grade text not null,
  current_grade text
);

alter table subjects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'subjects' and policyname = 'Users own their subjects v2'
  ) then
    create policy "Users own their subjects v2" on subjects
      for all using (
        auth.uid() = (select user_id from profiles where id = profile_id)
      )
      with check (
        auth.uid() = (select user_id from profiles where id = profile_id)
      );
  end if;
end $$;


-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_profiles_updated_at'
  ) then
    create trigger trg_profiles_updated_at
      before update on profiles
      for each row execute function update_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_strategy_choices_updated_at'
  ) then
    create trigger trg_strategy_choices_updated_at
      before update on strategy_choices
      for each row execute function update_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_ps_documents_updated_at'
  ) then
    create trigger trg_ps_documents_updated_at
      before update on ps_documents
      for each row execute function update_updated_at();
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- Tables: profiles (updated), subjects (kept), assessments (updated),
--         my_space_runs (new), shortlist_items (new),
--         strategy_choices (new), ps_documents (new),
--         ps_analysis_results (new)
-- All tables have RLS enabled with user-scoped policies.
-- All tables have relevant indexes.
-- updated_at triggers on profiles, strategy_choices, ps_documents.
-- ═══════════════════════════════════════════════════════════════
