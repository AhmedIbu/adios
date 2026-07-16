import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, listTracks, deleteTrack } from "./lib/supabase";
import {
  offlineIds as loadOfflineIds,
  saveOffline,
  removeOffline,
  cacheTrackList,
  getCachedTrackList
} from "./lib/offline";
import type { Track } from "./lib/types";
import { usePlayer } from "./hooks/usePlayer";
import { Gate } from "./components/Gate";
import { Library } from "./components/Library";
import { Upload } from "./components/Upload";
import { Player } from "./components/Player";

type Theme = "dark" | "light";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "dark"
  );

  const { state, play, toggle, seekBy, seekTo, setSpeed, setSleep } = usePlayer();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    listTracks()
      .then((ts) => {
        setTracks(ts);
        cacheTrackList(ts);
      })
      .catch(async (e) => {
        console.error(e);
        setTracks(await getCachedTrackList());
      });
    loadOfflineIds().then(setOffline);
  }, [session]);

  const handleToggleOffline = useCallback(async (t: Track) => {
    setSaving((s) => new Set(s).add(t.id));
    try {
      const kept = (await loadOfflineIds()).has(t.id);
      if (kept) {
        await removeOffline(t.id);
      } else {
        await saveOffline(t);
      }
      setOffline(await loadOfflineIds());
    } catch (e) {
      console.error(e);
      alert("Couldn't save offline — check your connection.");
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(t.id);
        return n;
      });
    }
  }, []);

  const handleDelete = useCallback(async (t: Track) => {
    if (!confirm(`Delete “${t.title}” everywhere (cloud + offline)?`)) return;
    await deleteTrack(t);
    await removeOffline(t.id);
    setTracks((ts) => {
      const next = ts.filter((x) => x.id !== t.id);
      cacheTrackList(next);
      return next;
    });
    setOffline(await loadOfflineIds());
  }, []);

  if (session === undefined) {
    return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  }
  if (!session) {
    return <Gate />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-36">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-bg/80 px-5 backdrop-blur-md">
        <h1 className="text-lg font-bold tracking-tight text-primary">Hey Ibu 👋</h1>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-dim transition-colors duration-200 hover:bg-surface-high hover:text-primary active:scale-90"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          <span className="material-symbols-outlined">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
      </header>

      <main className="animate-app-in px-5 pt-4">
        <Library
          tracks={tracks}
          currentId={state.track?.id ?? null}
          offlineIds={offline}
          savingOffline={saving}
          onPlay={play}
          onToggleOffline={handleToggleOffline}
          onDelete={handleDelete}
        />

        <Upload
          onUploaded={(t) =>
            setTracks((ts) => {
              const next = [t, ...ts];
              cacheTrackList(next);
              return next;
            })
          }
        />
      </main>

      <Player
        state={state}
        onToggle={toggle}
        onSeekBy={seekBy}
        onSeekTo={seekTo}
        onSpeed={setSpeed}
        onSleep={setSleep}
      />
    </div>
  );
}
