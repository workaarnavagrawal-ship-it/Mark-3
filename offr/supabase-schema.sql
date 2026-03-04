-- ============================================================
-- Offr Monologue — canonical schema (fresh install, v4)
-- Run in Supabase SQL editor or via psql.
-- For upgrades from v1-v3, run supabase-schema-v4.sql instead.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- profiles
-- ──────────────────────────────────────────────────────────

create table if not exists profiles (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        references auth.users(id) on delete cascade not null unique,
  name                 text        not null,
  year                 text        not null check (year in ('11', '12')),
  curriculum           text        not null check (curriculum in ('IB', 'A_LEVELS')),
  home_or_intl         text        not null default 'INTL'
                                   check (home_or_intl in ('HOME', 'INTL', 'home', 'intl')),

  -- persona: Monologue journey phase
  persona              text        check (persona in ('EXPLORER', 'STRATEGIST', 'FINISHER')),

  -- IB scores
  ib_subject_total     integer,                       -- sum of 6 subject predicted grades (max 42)
  ib_bonus_points      integer     default 2,         -- TOK + EE points (0–3)
  ib_total_points      integer,                       -- set by app: ib_subject_total + ib_bonus_points

  -- A-Level predicted grades (map: subject → grade)
  alevel_predicted     jsonb       default '{}',

  -- Interests
  interests            text[]      default '{}',      -- free-text interest list (legacy)
  interest_tags        text[]      default '{}',      -- structured interest tags (new)
  interests_text       text,                          -- free-text paragraph (v3)
  extracurriculars     text[]      default '{}',       -- extracurricular activities (v3)

  -- PS / application
  core_points          integer     default 2,         -- legacy; use ib_bonus_points instead
  ps_format            text        default 'UCAS_3Q',
  ps_q1                text,
  ps_q2                text,
  ps_q3                text,
  ps_statement         text,
  ps_last_analysis     jsonb,                          -- v2: cached PS analysis result

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ──────────────────────────────────────────────────────────
-- subjects
-- ──────────────────────────────────────────────────────────

create table if not exists subjects (
  id              uuid  primary key default gen_random_uuid(),
  profile_id      uuid  references profiles(id) on delete cascade not null,
  subject         text  not null,
  level           text  not null check (level in ('HL', 'SL', 'A_LEVEL')),
  predicted_grade text  not null,
  current_grade   text
);

-- ──────────────────────────────────────────────────────────
-- assessments (offer tracker)
-- ──────────────────────────────────────────────────────────

create table if not exists assessments (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete cascade not null,
  course_id       text        not null,
  course_name     text        not null,
  university_id   text        not null,
  university_name text        not null,
  band            text        not null check (band in ('Safe', 'Target', 'Reach')),
  chance_percent  integer     not null,
  result_json     jsonb       not null default '{}',
  label           text,
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────────────────
-- shortlisted_courses (legacy course-centric shortlist; kept for compat)
-- ──────────────────────────────────────────────────────────

create table if not exists shortlisted_courses (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        references auth.users(id) on delete cascade not null,
  course_key          text        not null,
  course_name         text        not null,
  universities_count  integer     default 0,
  created_at          timestamptz default now(),
  unique (user_id, course_key)
);

-- ──────────────────────────────────────────────────────────
-- strategy_choices — UCAS 5-slot final strategy
-- ──────────────────────────────────────────────────────────

create table if not exists strategy_choices (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete cascade not null,
  slot            integer     not null check (slot between 1 and 5),
  course_id       text        not null,
  university_id   text        not null,
  university_name text        not null,
  course_name     text        not null,
  degree_type     text,
  typical_offer   text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, slot)
);

-- ──────────────────────────────────────────────────────────
-- shortlist_items — richer shortlist for new Monologue UI
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

create unique index if not exists shortlist_items_uniq_group
  on shortlist_items (user_id, course_group_key)
  where item_type = 'COURSE_GROUP' and course_group_key is not null;

create unique index if not exists shortlist_items_uniq_offering
  on shortlist_items (user_id, course_id)
  where item_type = 'OFFERING' and course_id is not null;

-- ──────────────────────────────────────────────────────────
-- Row-level security
-- ──────────────────────────────────────────────────────────

alter table profiles          enable row level security;
alter table subjects          enable row level security;
alter table assessments       enable row level security;
alter table shortlisted_courses enable row level security;
alter table strategy_choices  enable row level security;
alter table shortlist_items   enable row level security;

create policy "Users own their profile"
  on profiles for all using (auth.uid() = user_id);

create policy "Users own their subjects"
  on subjects for all using (
    auth.uid() = (select user_id from profiles where id = profile_id)
  );

create policy "Users own their assessments"
  on assessments for all using (auth.uid() = user_id);

create policy "Users own their shortlisted courses"
  on shortlisted_courses for all using (auth.uid() = user_id);

create policy "Users own their strategy"
  on strategy_choices for all using (auth.uid() = user_id);

create policy "Users own their shortlist items"
  on shortlist_items for all using (auth.uid() = user_id);
