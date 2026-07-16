import { createClient } from "@supabase/supabase-js";
import type { Track, Folder } from "./types";

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

export async function deleteTrack(t: Track): Promise<void> {
  await supabase.storage.from("audio").remove([t.storage_path]);
  await supabase.from("tracks").delete().eq("id", t.id);
}
