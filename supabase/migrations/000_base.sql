-- ============================================
-- Run Tracker — base objects
-- Run first on a fresh Supabase project. Safe to run on a project that
-- already has the BJJ Tracker schema: everything here is idempotent and
-- leaves the BJJ versions alone.
-- ============================================

create extension if not exists "uuid-ossp";

-- One row per user; run_* tables reference it.
-- (BJJ Tracker's schema creates a richer version of this table. If it
-- exists already, this is skipped.)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;
-- No client policies: the app never reads profiles directly.

-- Create a profiles row whenever an auth user is created (dashboard or sign-in).
-- Separate name from BJJ Tracker's handle_new_user(), so neither replaces
-- the other; on conflict covers the case where both triggers run.
create or replace function public.run_handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_run on auth.users;
create trigger on_auth_user_created_run
  after insert on auth.users
  for each row execute procedure public.run_handle_new_user();

-- Users that existed before this ran.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- updated_at helper (same definition as BJJ Tracker's).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
