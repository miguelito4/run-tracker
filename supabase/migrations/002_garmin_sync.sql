-- ============================================
-- Run Tracker — Garmin sync support
-- Run once in the Supabase SQL editor, after 001.
-- ============================================

-- When the last complete sync ran, and what the most recent attempt did.
alter table public.run_settings
  add column if not exists garmin_synced_at timestamptz,
  add column if not exists garmin_last_result jsonb;

-- Private bucket for the original .FIT files. Only the server (service role)
-- reads and writes it; there are no client policies, so browsers can't.
insert into storage.buckets (id, name, public)
values ('run-fit', 'run-fit', false)
on conflict (id) do nothing;
