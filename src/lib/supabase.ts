import { createClient } from "@supabase/supabase-js";
import type { Track, Folder } from "./types";
import { DEFAULT_FOLDERS } from "./types";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true, // log in once per device, then never again
      autoRefreshToken: true
    }
  }
);

export async function listTracks(): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Track[];
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(path, 60 * 60 * 6); // 6 hours
  if (error || !data) throw error ?? new Error("No signed URL");
  return data.signedUrl;
}

export async function uploadTrack(
  file: File,
  folder: Folder,
  duration: number,
  onDone: (t: Track) => void
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${uid}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("audio")
    .upload(path, file, { contentType: file.type || "audio/mpeg" });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      title: file.name.replace(/\.[^.]+$/, ""),
      folder,
      duration,
      storage_path: path
    })
    .select()
    .single();
  if (error) throw error;
  onDone(data as Track);
}

export async function savePosition(id: string, position: number): Promise<void> {
  await supabase.from("tracks").update({ position }).eq("id", id);
}

export async function markPlayed(id: string): Promise<void> {
  await supabase.from("tracks").update({ last_played_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteTrack(t: Track): Promise<void> {
  await supabase.storage.from("audio").remove([t.storage_path]);
  await supabase.from("tracks").delete().eq("id", t.id);
}

export async function renameTrack(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("tracks").update({ title }).eq("id", id);
  if (error) throw error;
}

export interface FolderRow {
  id: string;
  name: string;
}

export async function listFolders(): Promise<FolderRow[]> {
  const { data, error } = await supabase.from("folders").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Seeds the folders table with the folders already in use, but only if empty. */
export async function seedDefaultFoldersIfEmpty(): Promise<FolderRow[]> {
  const existing = await listFolders();
  if (existing.length > 0) return existing;
  const { data, error } = await supabase
    .from("folders")
    .insert(DEFAULT_FOLDERS.map((name) => ({ name })))
    .select("id, name");
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(name: string): Promise<FolderRow> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

/** Renames the folder and repoints every track that used the old name. */
export async function renameFolder(id: string, oldName: string, newName: string): Promise<void> {
  const { error: fErr } = await supabase.from("folders").update({ name: newName }).eq("id", id);
  if (fErr) throw fErr;
  const { error: tErr } = await supabase
    .from("tracks")
    .update({ folder: newName })
    .eq("folder", oldName);
  if (tErr) throw tErr;
}

/** Refuses to delete a folder that still has tracks in it. */
export async function deleteFolder(id: string, name: string): Promise<void> {
  const { count, error: cErr } = await supabase
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .eq("folder", name);
  if (cErr) throw cErr;
  if (count && count > 0) {
    throw new Error(`Move or delete the ${count} track(s) in this folder first.`);
  }
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}
