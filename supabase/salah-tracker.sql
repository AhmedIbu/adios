-- Run this once in Supabase Dashboard → SQL Editor.
-- Adds the Salah tracker: per-day prayer statuses and qada (make-up) logs.
-- Qada "owed" counts are derived in the app (missed prayers minus logged
-- make-ups), so there is no separate counter table to keep in sync.

create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  status text not null check (status in ('on_time', 'late', 'missed')),
  created_at timestamptz not null default now(),
  unique (user_id, day, prayer)
);

alter table public.prayer_logs enable row level security;

create policy "own prayer_logs: select" on public.prayer_logs
  for select using (auth.uid() = user_id);
create policy "own prayer_logs: insert" on public.prayer_logs
  for insert with check (auth.uid() = user_id);
create policy "own prayer_logs: update" on public.prayer_logs
  for update using (auth.uid() = user_id);
create policy "own prayer_logs: delete" on public.prayer_logs
  for delete using (auth.uid() = user_id);

create table if not exists public.qada_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  completed_at timestamptz not null default now()
);

alter table public.qada_logs enable row level security;

create policy "own qada_logs: select" on public.qada_logs
  for select using (auth.uid() = user_id);
create policy "own qada_logs: insert" on public.qada_logs
  for insert with check (auth.uid() = user_id);
create policy "own qada_logs: delete" on public.qada_logs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Phase A additions: khushu (focus) rating, sunnah tracking, optional Tahajjud
-- slot. Safe to re-run — uses IF NOT EXISTS / a DO block to find and replace
-- the prayer check by definition rather than by a guessed constraint name.
-- ---------------------------------------------------------------------------

alter table public.prayer_logs
  add column if not exists khushu smallint,
  add column if not exists sunnah boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.prayer_logs'::regclass
      and conname = 'prayer_logs_khushu_range'
  ) then
    alter table public.prayer_logs
      add constraint prayer_logs_khushu_range check (khushu is null or (khushu between 1 and 10));
  end if;
end $$;

-- Widen the prayer check to also allow the optional Tahajjud slot.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.prayer_logs'::regclass
      and pg_get_constraintdef(oid) like '%prayer = ANY%'
  loop
    execute format('alter table public.prayer_logs drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.prayer_logs
  add constraint prayer_logs_prayer_check
  check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud'));
