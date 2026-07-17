import { get, set, del, keys } from "idb-keyval";
import { signedUrl } from "./supabase";
import type { Track } from "./types";

const KEY = (id: string) => `audio-blob:${id}`;
const TRACK_LIST_KEY = "track-list-cache";

interface OfflineEntry {
  blob: Blob;
  /** ms epoch; null means kept offline indefinitely. */
  expiresAt: number | null;
}

function isExpired(entry: OfflineEntry): boolean {
  return entry.expiresAt !== null && Date.now() > entry.expiresAt;
}

export async function isOffline(id: string): Promise<boolean> {
  const entry = (await get(KEY(id))) as OfflineEntry | undefined;
  return !!entry && !isExpired(entry);
}

/** Ids currently kept offline. Lazily prunes any entries that have expired. */
export async function offlineIds(): Promise<Set<string>> {
  const ks = (await keys()) as string[];
  const blobKeys = ks.filter((k) => typeof k === "string" && k.startsWith("audio-blob:"));
  const valid = new Set<string>();
  for (const k of blobKeys) {
    const id = k.slice("audio-blob:".length);
    const entry = (await get(k)) as OfflineEntry | undefined;
    if (!entry) continue;
    if (isExpired(entry)) {
      await del(k);
    } else {
      valid.add(id);
    }
  }
  return valid;
}

/** Returns the expiry timestamp for an offline track, or undefined if not kept offline / no limit. */
export async function offlineExpiry(id: string): Promise<number | null | undefined> {
  const entry = (await get(KEY(id))) as OfflineEntry | undefined;
  return entry ? entry.expiresAt : undefined;
}

/**
 * Download a track's audio into IndexedDB for offline playback.
 * @param durationMs how long to keep it offline; null keeps it indefinitely.
 */
export async function saveOffline(track: Track, durationMs: number | null): Promise<void> {
  const url = await signedUrl(track.storage_path);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const expiresAt = durationMs === null ? null : Date.now() + durationMs;
  await set(KEY(track.id), { blob, expiresAt } satisfies OfflineEntry);
}

export async function removeOffline(id: string): Promise<void> {
  await del(KEY(id));
}

/** Returns a playable URL: local blob if kept offline (and not expired), else a signed cloud URL. */
export async function playableUrl(track: Track): Promise<{ url: string; local: boolean }> {
  const entry = (await get(KEY(track.id))) as OfflineEntry | undefined;
  if (entry && !isExpired(entry)) {
    return { url: URL.createObjectURL(entry.blob), local: true };
  }
  if (entry) await del(KEY(track.id)); // expired — clean up lazily
  return { url: await signedUrl(track.storage_path), local: false };
}

/** Cache the last known track list so the library can render when offline. */
export async function cacheTrackList(tracks: Track[]): Promise<void> {
  await set(TRACK_LIST_KEY, tracks);
}

export async function getCachedTrackList(): Promise<Track[]> {
  return ((await get(TRACK_LIST_KEY)) as Track[] | undefined) ?? [];
}
