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

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'prayer_logs' and policyname = 'own prayer_logs: select') then
    create policy "own prayer_logs: select" on public.prayer_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prayer_logs' and policyname = 'own prayer_logs: insert') then
    create policy "own prayer_logs: insert" on public.prayer_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prayer_logs' and policyname = 'own prayer_logs: update') then
    create policy "own prayer_logs: update" on public.prayer_logs for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prayer_logs' and policyname = 'own prayer_logs: delete') then
    create policy "own prayer_logs: delete" on public.prayer_logs for delete using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.qada_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  completed_at timestamptz not null default now()
);

alter table public.qada_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'qada_logs' and policyname = 'own qada_logs: select') then
    create policy "own qada_logs: select" on public.qada_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'qada_logs' and policyname = 'own qada_logs: insert') then
    create policy "own qada_logs: insert" on public.qada_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'qada_logs' and policyname = 'own qada_logs: delete') then
    create policy "own qada_logs: delete" on public.qada_logs for delete using (auth.uid() = user_id);
  end if;
end $$;

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

-- ---------------------------------------------------------------------------
-- Phase C additions: prayer-time accuracy. logged_at captures the moment a
-- prayer was marked prayed (refreshed on every write), compared against a
-- locally-computed adhan time (adhan.js, no network/API) using stored
-- coordinates + calculation settings.
-- ---------------------------------------------------------------------------

alter table public.prayer_logs
  add column if not exists logged_at timestamptz not null default now();

create table if not exists public.salah_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  latitude double precision,
  longitude double precision,
  calc_method text not null default 'MuslimWorldLeague',
  madhab text not null default 'shafi' check (madhab in ('shafi', 'hanafi')),
  updated_at timestamptz not null default now()
);

alter table public.salah_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'salah_settings' and policyname = 'own salah_settings: select') then
    create policy "own salah_settings: select" on public.salah_settings for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'salah_settings' and policyname = 'own salah_settings: insert') then
    create policy "own salah_settings: insert" on public.salah_settings for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'salah_settings' and policyname = 'own salah_settings: update') then
    create policy "own salah_settings: update" on public.salah_settings for update using (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Phase D additions: daily reflection journal, an answered-duas ledger, and
-- optional per-prayer intentions (typed or a short voice note).
-- ---------------------------------------------------------------------------

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  prompt text not null,
  text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.reflections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reflections' and policyname = 'own reflections: select') then
    create policy "own reflections: select" on public.reflections for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reflections' and policyname = 'own reflections: insert') then
    create policy "own reflections: insert" on public.reflections for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reflections' and policyname = 'own reflections: update') then
    create policy "own reflections: update" on public.reflections for update using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.answered_duas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  asked_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.answered_duas enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'answered_duas' and policyname = 'own answered_duas: select') then
    create policy "own answered_duas: select" on public.answered_duas for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'answered_duas' and policyname = 'own answered_duas: insert') then
    create policy "own answered_duas: insert" on public.answered_duas for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'answered_duas' and policyname = 'own answered_duas: update') then
    create policy "own answered_duas: update" on public.answered_duas for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'answered_duas' and policyname = 'own answered_duas: delete') then
    create policy "own answered_duas: delete" on public.answered_duas for delete using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud')),
  text text,
  audio_path text,
  created_at timestamptz not null default now(),
  unique (user_id, day, prayer)
);

alter table public.intentions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'intentions' and policyname = 'own intentions: select') then
    create policy "own intentions: select" on public.intentions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'intentions' and policyname = 'own intentions: insert') then
    create policy "own intentions: insert" on public.intentions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'intentions' and policyname = 'own intentions: update') then
    create policy "own intentions: update" on public.intentions for update using (auth.uid() = user_id);
  end if;
end $$;

-- Private bucket for voice-note intentions — same user-scoped path pattern as
-- the 'audio' bucket in setup.sql.
insert into storage.buckets (id, name, public)
values ('salah-audio', 'salah-audio', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'own salah-audio: read') then
    create policy "own salah-audio: read" on storage.objects for select using (bucket_id = 'salah-audio' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'own salah-audio: upload') then
    create policy "own salah-audio: upload" on storage.objects for insert with check (bucket_id = 'salah-audio' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'own salah-audio: delete') then
    create policy "own salah-audio: delete" on storage.objects for delete using (bucket_id = 'salah-audio' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Sins tracker: a private accountability log, separate from the original
-- 21-feature list. sin_types is a user-editable list (severity 1-5, mild to
-- major, mapped to a color ramp in the app); sin_logs is an append-only log
-- (no update policy — entries are logged and can be deleted, not edited).
-- ---------------------------------------------------------------------------

create table if not exists public.sin_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  severity smallint not null default 3 check (severity between 1 and 5),
  sort_order numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sin_types enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sin_types' and policyname = 'own sin_types: select') then
    create policy "own sin_types: select" on public.sin_types for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sin_types' and policyname = 'own sin_types: insert') then
    create policy "own sin_types: insert" on public.sin_types for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sin_types' and policyname = 'own sin_types: update') then
    create policy "own sin_types: update" on public.sin_types for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sin_types' and policyname = 'own sin_types: delete') then
    create policy "own sin_types: delete" on public.sin_types for delete using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.sin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sin_type_id uuid not null references public.sin_types (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  note text
);

alter table public.sin_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sin_logs' and policyname = 'own sin_logs: select') then
    create policy "own sin_logs: select" on public.sin_logs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sin_logs' and policyname = 'own sin_logs: insert') then
    create policy "own sin_logs: insert" on public.sin_logs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sin_logs' and policyname = 'own sin_logs: delete') then
    create policy "own sin_logs: delete" on public.sin_logs for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Rename the 'late' prayer status to 'qada' — a prayer logged after its due
-- time is a qada (make-up) prayer, not merely "late". Safe to re-run.
-- ---------------------------------------------------------------------------

do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.prayer_logs'::regclass
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.prayer_logs drop constraint %I', con.conname);
  end loop;
end $$;

update public.prayer_logs set status = 'qada' where status = 'late';

alter table public.prayer_logs
  add constraint prayer_logs_status_check
  check (status in ('on_time', 'qada', 'missed'));
