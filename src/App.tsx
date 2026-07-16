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
    <div className="mesh-gradient mx-auto min-h-dvh max-w-xl pb-44">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-bg/60 px-4 backdrop-blur-md">
        <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
          Hey Ibu 👋
        </h1>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-on-surface-dim transition-colors duration-200 hover:text-primary active:scale-90"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          <span className="material-symbols-outlined text-xl">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
      </header>

      <main className="animate-app-in space-y-6 px-4 pt-4">
        <Library
          tracks={tracks}
          currentId={state.track?.id ?? null}
          offlineIds={offline}
          savingOffline={saving}
          onPlay={play}
          onToggleOffline={handleToggleOffline}
          onDelete={handleDelete}
        />

        <div id="upload-section">
          <Upload
            onUploaded={(t) =>
              setTracks((ts) => {
                const next = [t, ...ts];
                cacheTrackList(next);
                return next;
              })
            }
          />
        </div>
      </main>

      <Player
        state={state}
        onToggle={toggle}
        onSeekBy={seekBy}
        onSeekTo={seekTo}
        onSpeed={setSpeed}
        onSleep={setSleep}
      />

      <nav className="fixed bottom-0 z-50 w-full border-t border-white/5 bg-bg/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-around px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            className="flex flex-col items-center justify-center text-primary transition-transform active:scale-90"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="material-symbols-outlined is-filled text-2xl">library_music</span>
            <span className="mt-1 text-[9px] font-extrabold tracking-widest uppercase">
              Library
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center text-on-surface-dim/60 transition-all duration-200 hover:text-on-surface active:scale-90"
            onClick={() => {
              document.getElementById("library-search")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
              document.getElementById("library-search")?.focus();
            }}
          >
            <span className="material-symbols-outlined text-2xl">search</span>
            <span className="mt-1 text-[9px] font-bold tracking-widest uppercase">Search</span>
          </button>
          <button
            className="flex flex-col items-center justify-center text-on-surface-dim/60 transition-all duration-200 hover:text-on-surface active:scale-90"
            onClick={() =>
              document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <span className="material-symbols-outlined text-2xl">upload_file</span>
            <span className="mt-1 text-[9px] font-bold tracking-widest uppercase">Upload</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
