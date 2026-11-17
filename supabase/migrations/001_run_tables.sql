-- ============================================
-- Run Tracker — tables
-- Run once in the Supabase SQL editor, after 000_base.sql. Every table is
-- prefixed run_ so nothing collides with BJJ Tracker's tables if both share
-- a project. The app only READS public.sessions (BJJ); it never writes to it.
-- Depends on public.profiles, public.set_updated_at() and uuid-ossp (000).
-- ============================================

-- --------------------------------------------
-- RUN ACTIVITIES: one row per run
-- Watch fields come from Garmin sync (source = 'garmin') or manual entry.
-- Journal fields (grade, rpe, intent, notes) are always yours.
-- --------------------------------------------
create table public.run_activities (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  source          text not null default 'manual' check (source in ('manual','garmin','coros')),
  external_id     text,                       -- Garmin activity id; null for manual
  started_at      timestamptz,
  run_date        date not null default current_date,
  title           text,

  -- watch data (SI units; the app converts for display)
  distance_m      numeric(9,1) check (distance_m >= 0),
  duration_s      integer check (duration_s >= 0),
  moving_s        integer check (moving_s >= 0),
  avg_hr          smallint check (avg_hr between 30 and 250),
  max_hr          smallint check (max_hr between 30 and 250),
  elev_gain_m     numeric(7,1),
  temp_c          numeric(4,1),
  zone_s          jsonb,                      -- {"z1":780,"z2":1320,...} seconds per HR zone
  under_cap_s     integer,                    -- seconds with HR <= cap at sync time
  run_s           integer,                    -- seconds running (run/walk detection)
  walk_s          integer,                    -- seconds walking
  fit_path        text,                       -- Supabase Storage path to the raw .FIT

  -- journal
  grade           text check (grade in ('excellent','good','flat','reduced','dnr')),
  rpe             smallint check (rpe between 1 and 10),
  intent          text check (intent in ('very_easy','easy','easy_mod','strides','hills','tempo','threshold','race','long')),
  notes           text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, source, external_id)
);

create index idx_run_activities_user_date on public.run_activities(user_id, run_date desc);

alter table public.run_activities enable row level security;
create policy "run_activities select own" on public.run_activities for select using (auth.uid() = user_id);
create policy "run_activities insert own" on public.run_activities for insert with check (auth.uid() = user_id);
create policy "run_activities update own" on public.run_activities for update using (auth.uid() = user_id);
create policy "run_activities delete own" on public.run_activities for delete using (auth.uid() = user_id);

create trigger run_activities_updated_at
  before update on public.run_activities
  for each row execute procedure public.set_updated_at();

-- --------------------------------------------
-- RUN SUPPLEMENTS: the non-running work, one row per day
-- (BJJ is not stored here — it's read from public.sessions)
-- --------------------------------------------
create table public.run_supplements (
  user_id     uuid references public.profiles(id) on delete cascade not null,
  day         date not null,
  core        boolean not null default false,
  legs        boolean not null default false,
  mobility    boolean not null default false,
  roll        boolean not null default false,
  upper       boolean not null default false,
  updated_at  timestamptz default now(),
  primary key (user_id, day)
);

alter table public.run_supplements enable row level security;
create policy "run_supplements select own" on public.run_supplements for select using (auth.uid() = user_id);
create policy "run_supplements insert own" on public.run_supplements for insert with check (auth.uid() = user_id);
create policy "run_supplements update own" on public.run_supplements for update using (auth.uid() = user_id);
create policy "run_supplements delete own" on public.run_supplements for delete using (auth.uid() = user_id);

-- --------------------------------------------
-- RUN LEVERS: Chad's rule. Hold a load for N weeks, then change ONE thing.
-- The current block is the row with the latest start_date.
-- --------------------------------------------
create table public.run_levers (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  start_date  date not null default current_date,
  lever       text not null check (lever in ('hold','volume','intensity')),
  hold_weeks  smallint not null default 3 check (hold_weeks between 1 and 12),
  note        text,
  created_at  timestamptz default now()
);

create index idx_run_levers_user_start on public.run_levers(user_id, start_date desc);

alter table public.run_levers enable row level security;
create policy "run_levers select own" on public.run_levers for select using (auth.uid() = user_id);
create policy "run_levers insert own" on public.run_levers for insert with check (auth.uid() = user_id);
create policy "run_levers update own" on public.run_levers for update using (auth.uid() = user_id);
create policy "run_levers delete own" on public.run_levers for delete using (auth.uid() = user_id);

-- --------------------------------------------
-- RUN SETTINGS: one row per user
-- --------------------------------------------
create table public.run_settings (
  user_id       uuid references public.profiles(id) on delete cascade primary key,
  accent        text not null default 'volt',
  default_mode  text not null default 'recreational' check (default_mode in ('recreational','performance')),
  hr_cap        smallint not null default 140 check (hr_cap between 90 and 200),
  units         text not null default 'mi' check (units in ('mi','km')),
  show_bjj      boolean not null default true,
  updated_at    timestamptz default now()
);

alter table public.run_settings enable row level security;
create policy "run_settings select own" on public.run_settings for select using (auth.uid() = user_id);
create policy "run_settings insert own" on public.run_settings for insert with check (auth.uid() = user_id);
create policy "run_settings update own" on public.run_settings for update using (auth.uid() = user_id);

create trigger run_settings_updated_at
  before update on public.run_settings
  for each row execute procedure public.set_updated_at();
