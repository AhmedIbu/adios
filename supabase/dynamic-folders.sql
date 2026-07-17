-- Run this once in Supabase Dashboard → SQL Editor.
-- Adds a folders table so folders can be created, renamed, and deleted
-- from the app instead of being a fixed list.
--
-- tracks.folder stays a plain text column matched by folder NAME (not a
-- foreign key) to avoid migrating the existing 336 rows to an id-based
-- reference. The app is the one place that keeps them in sync — see
-- renameFolder() in src/lib/supabase.ts.
--
-- The first time the signed-in app user loads with zero rows in this
-- table, the app itself seeds the 7 folders that already exist on your
-- tracks (music, beginning-to-the-end, emotional-reminders,
-- lessons-from-quran, motivational-reminders, powerful-reminders, notes)
-- — no manual seeding needed here, since inserting as the app's
-- authenticated user is what makes auth.uid() resolve correctly for RLS.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.folders enable row level security;

create policy "own folders: select" on public.folders
  for select using (auth.uid() = user_id);
create policy "own folders: insert" on public.folders
  for insert with check (auth.uid() = user_id);
create policy "own folders: update" on public.folders
  for update using (auth.uid() = user_id);
create policy "own folders: delete" on public.folders
  for delete using (auth.uid() = user_id);

-- folder is now free text validated at the app layer against the
-- folders table, not a fixed DB-level list.
alter table public.tracks drop constraint if exists tracks_folder_check;
