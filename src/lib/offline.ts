import { get, set, del, keys } from "idb-keyval";
import { signedUrl } from "./supabase";
import type { Track } from "./types";

const KEY = (id: string) => `audio-blob:${id}`;
const TRACK_LIST_KEY = "track-list-cache";

export async function isOffline(id: string): Promise<boolean> {
  return (await get(KEY(id))) !== undefined;
}

export async function offlineIds(): Promise<Set<string>> {
  const ks = (await keys()) as string[];
  return new Set(
    ks
      .filter((k) => typeof k === "string" && k.startsWith("audio-blob:"))
      .map((k) => (k as string).slice("audio-blob:".length))
  );
}

/** Download a track's audio into IndexedDB for offline playback. */
export async function saveOffline(track: Track): Promise<void> {
  const url = await signedUrl(track.storage_path);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  await set(KEY(track.id), blob);
}

export async function removeOffline(id: string): Promise<void> {
  await del(KEY(id));
}

/** Returns a playable URL: local blob if kept offline, else a signed cloud URL. */
export async function playableUrl(track: Track): Promise<{ url: string; local: boolean }> {
  const blob = (await get(KEY(track.id))) as Blob | undefined;
  if (blob) return { url: URL.createObjectURL(blob), local: true };
  return { url: await signedUrl(track.storage_path), local: false };
}

/** Cache the last known track list so the library can render when offline. */
export async function cacheTrackList(tracks: Track[]): Promise<void> {
  await set(TRACK_LIST_KEY, tracks);
}

export async function getCachedTrackList(): Promise<Track[]> {
  return ((await get(TRACK_LIST_KEY)) as Track[] | undefined) ?? [];
}
