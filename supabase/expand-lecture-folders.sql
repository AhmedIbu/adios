-- Run this once in Supabase Dashboard → SQL Editor.
-- Replaces the single 'lectures' folder with 5 folders matching the
-- MediaHuman import, alongside the existing 'music' and 'notes'.
--
-- Finds and drops ANY existing check constraint on tracks.folder by
-- definition (not by a guessed name) before adding the new one.
--
-- Added NOT VALID: your 335 existing tracks still have folder='lectures',
-- which isn't in the new allowed list, so validating immediately would
-- fail. NOT VALID skips checking existing rows but still enforces the
-- rule on every new insert/update from now on. After running
-- scripts/reclassify-lectures.mjs to move those rows to their real
-- folders, run the VALIDATE CONSTRAINT statement at the bottom to fully
-- enforce it.

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.tracks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%folder%'
  loop
    execute format('alter table public.tracks drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.tracks add constraint tracks_folder_check
  check (folder in (
    'music',
    'beginning-to-the-end',
    'emotional-reminders',
    'lessons-from-quran',
    'motivational-reminders',
    'powerful-reminders',
    'notes'
  )) not valid;

alter table public.tracks alter column folder set default 'music';

-- Sanity check: should show exactly one row, the constraint above (is_valid = false for now).
select conname, convalidated as is_valid, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.tracks'::regclass and contype = 'c';

-- ============================================================
-- Run this SEPARATELY, only after scripts/reclassify-lectures.mjs
-- has finished moving all 335 tracks out of 'lectures':
--
--   alter table public.tracks validate constraint tracks_folder_check;
-- ============================================================
