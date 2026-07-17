-- Run this once in Supabase Dashboard → SQL Editor.
-- Adds a last_played_at column so the Library can show recently played
-- tracks instead of just recently uploaded ones.

alter table public.tracks add column if not exists last_played_at timestamptz;
