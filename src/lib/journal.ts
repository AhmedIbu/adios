import { supabase } from "./supabase";
import type { Prayer } from "./salah";

export interface Reflection {
  id: string;
  day: string;
  prompt: string;
  text: string;
}

export interface AnsweredDua {
  id: string;
  text: string;
  asked_at: string;
  answered_at: string | null;
}

export interface Intention {
  id: string;
  day: string;
  prayer: Prayer;
  text: string | null;
  audio_path: string | null;
}

// ---------- Reflections ----------

export async function listReflections(): Promise<Reflection[]> {
  const { data, error } = await supabase
    .from("reflections")
    .select("id, day, prompt, text")
    .order("day", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reflection[];
}

export async function saveReflection(day: string, prompt: string, text: string): Promise<Reflection> {
  const { data, error } = await supabase
    .from("reflections")
    .upsert({ day, prompt, text }, { onConflict: "user_id,day" })
    .select("id, day, prompt, text")
    .single();
  if (error) throw error;
  return data as Reflection;
}

// ---------- Answered duas ----------

export async function listAnsweredDuas(): Promise<AnsweredDua[]> {
  const { data, error } = await supabase
    .from("answered_duas")
    .select("id, text, asked_at, answered_at")
    .order("asked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AnsweredDua[];
}

export async function addDua(text: string): Promise<AnsweredDua> {
  const { data, error } = await supabase
    .from("answered_duas")
    .insert({ text })
    .select("id, text, asked_at, answered_at")
    .single();
  if (error) throw error;
  return data as AnsweredDua;
}

export async function markDuaAnswered(id: string): Promise<AnsweredDua> {
  const { data, error } = await supabase
    .from("answered_duas")
    .update({ answered_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, text, asked_at, answered_at")
    .single();
  if (error) throw error;
  return data as AnsweredDua;
}

export async function deleteDua(id: string): Promise<void> {
  const { error } = await supabase.from("answered_duas").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Intentions ----------

export async function listIntentions(): Promise<Intention[]> {
  const { data, error } = await supabase
    .from("intentions")
    .select("id, day, prayer, text, audio_path")
    .order("day", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Intention[];
}

export async function saveIntentionText(
  day: string,
  prayer: Prayer,
  text: string
): Promise<Intention> {
  const { data, error } = await supabase
    .from("intentions")
    .upsert(
      { day, prayer, text, audio_path: null },
      { onConflict: "user_id,day,prayer" }
    )
    .select("id, day, prayer, text, audio_path")
    .single();
  if (error) throw error;
  return data as Intention;
}

export async function saveIntentionAudio(
  day: string,
  prayer: Prayer,
  blob: Blob
): Promise<Intention> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");

  const ext = blob.type.includes("mp4") ? "m4a" : "webm";
  const path = `${uid}/${day}-${prayer}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("salah-audio")
    .upload(path, blob, { contentType: blob.type || "audio/webm" });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("intentions")
    .upsert(
      { day, prayer, text: null, audio_path: path },
      { onConflict: "user_id,day,prayer" }
    )
    .select("id, day, prayer, text, audio_path")
    .single();
  if (error) throw error;
  return data as Intention;
}

export async function intentionAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("salah-audio")
    .createSignedUrl(path, 60 * 60);
  if (error || !data) throw error ?? new Error("No signed URL");
  return data.signedUrl;
}
