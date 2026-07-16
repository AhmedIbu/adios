-- Run this once in Supabase Dashboard → SQL Editor.

-- 1. Tracks table
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  folder text not null default 'music' check (folder in ('music', 'lectures', 'notes')),
  duration numeric not null default 0,
  position numeric not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;

create policy "own tracks: select" on public.tracks
  for select using (auth.uid() = user_id);
create policy "own tracks: insert" on public.tracks
  for insert with check (auth.uid() = user_id);
create policy "own tracks: update" on public.tracks
  for update using (auth.uid() = user_id);
create policy "own tracks: delete" on public.tracks
  for delete using (auth.uid() = user_id);

-- 2. Private storage bucket
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

create policy "own audio: read" on storage.objects
  for select using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own audio: upload" on storage.objects
  for insert with check (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own audio: delete" on storage.objects
  for delete using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
