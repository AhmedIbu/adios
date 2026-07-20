-- Run this once in Supabase Dashboard → SQL Editor.
-- Adds a per-folder sort_order so tracks can be manually reordered
-- (drag-and-drop in Browse). Backfilled to match the current
-- newest-first ordering within each folder, so nothing visibly moves
-- until you actually drag something.

alter table public.tracks add column if not exists sort_order double precision;

update public.tracks t
set sort_order = sub.rn
from (
  select id, row_number() over (partition by folder order by created_at desc) as rn
  from public.tracks
) sub
where t.id = sub.id and t.sort_order is null;
