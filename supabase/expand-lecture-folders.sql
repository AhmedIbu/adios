-- Run this once in Supabase Dashboard → SQL Editor.
-- Replaces the single 'lectures' folder with 5 folders matching the
-- MediaHuman import, alongside the existing 'music' and 'notes'.
--
-- Finds and drops ANY existing check constraint on tracks.folder by
-- definition (not by a guessed name) before adding the new one, so this
-- is safe to run even if the constraint was auto-named differently than
-- expected.

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
  ));

alter table public.tracks alter column folder set default 'music';

-- Sanity check: this should show exactly one row, the constraint above.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.tracks'::regclass and contype = 'c';
