import { useEffect, useState, useCallback } from "react";
import { listTracks, deleteTrack } from "./lib/supabase";
import {
  offlineIds as loadOfflineIds,
  saveOffline,
  removeOffline,
  cacheTrackList,
  getCachedTrackList
} from "./lib/offline";
import type { Track } from "./lib/types";
import { usePlayer } from "./hooks/usePlayer";
import { Library } from "./components/Library";
import { Upload } from "./components/Upload";
import { Player } from "./components/Player";

type Theme = "dark" | "light";

export default function App() {
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
  }, []);

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

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__brand">Hey Ibu 👋</h1>
        <button
          className="app__theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

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
