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
      storage_path: path,
      // Negative epoch ms so new uploads always sort first within their
      // folder, without needing to query the current minimum first.
      sort_order: -Date.now()
    })
    .select()
    .single();
  if (error) throw error;
  onDone(data as Track);
}

/** Moves a track to a new position within its folder via fractional indexing. */
export async function reorderTrack(id: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from("tracks").update({ sort_order: sortOrder }).eq("id", id);
  if (error) throw error;
}

export async function savePosition(id: string, position: number): Promise<void> {
  await supabase.from("tracks").update({ position }).eq("id", id);
}

export async function markPlayed(id: string): Promise<void> {
  await supabase.from("tracks").update({ last_played_at: new Date().toISOString() }).eq("id", id);
}

/** Total bytes used in the audio bucket for the signed-in user. */
export async function getStorageUsage(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return 0;

  let total = 0;
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from("audio").list(uid, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const f of data) total += f.metadata?.size ?? 0;
    if (data.length < limit) break;
    offset += limit;
  }
  return total;
}

export async function deleteTrack(t: Track): Promise<void> {
  await supabase.storage.from("audio").remove([t.storage_path]);
  await supabase.from("tracks").delete().eq("id", t.id);
}

export async function renameTrack(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("tracks").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function moveTrack(id: string, folder: string): Promise<void> {
  const { error } = await supabase
    .from("tracks")
    .update({ folder, sort_order: -Date.now() })
    .eq("id", id);
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

/** Deletes the folder AND every track (audio file + row) in it. Irreversible. */
export async function deleteFolderCascade(id: string, name: string): Promise<void> {
  const { data: rows, error: listErr } = await supabase
    .from("tracks")
    .select("storage_path")
    .eq("folder", name);
  if (listErr) throw listErr;

  const paths = (rows ?? []).map((r) => r.storage_path);
  if (paths.length > 0) {
    const { error: rmErr } = await supabase.storage.from("audio").remove(paths);
    if (rmErr) throw rmErr;
  }

  const { error: delTracksErr } = await supabase.from("tracks").delete().eq("folder", name);
  if (delTracksErr) throw delTracksErr;

  const { error: delFolderErr } = await supabase.from("folders").delete().eq("id", id);
  if (delFolderErr) throw delFolderErr;
}
