-- Run this once in Supabase Dashboard → SQL Editor.
-- Replaces the single 'lectures' folder with 5 folders matching the
-- MediaHuman import, alongside the existing 'music' and 'notes'.

alter table public.tracks drop constraint if exists tracks_folder_check;

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
