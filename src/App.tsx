import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  listTracks,
  deleteTrack,
  renameTrack,
  markPlayed,
  seedDefaultFoldersIfEmpty,
  createFolder,
  renameFolder,
  deleteFolder
} from "./lib/supabase";
import type { FolderRow } from "./lib/supabase";
import {
  offlineIds as loadOfflineIds,
  saveOffline,
  removeOffline,
  cacheTrackList,
  getCachedTrackList
} from "./lib/offline";
import type { Track } from "./lib/types";
import { folderLabel } from "./lib/types";
import { usePlayer } from "./hooks/usePlayer";
import { Gate } from "./components/Gate";
import { Library } from "./components/Library";
import { Upload } from "./components/Upload";
import { Player } from "./components/Player";

type Theme = "dark" | "light";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "dark"
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [view, setView] = useState<"home" | "upload" | "browse">("home");
  const [browseFolder, setBrowseFolder] = useState<string>("all");

  const goHome = useCallback(() => {
    setDrawerOpen(false);
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBrowse = useCallback((folder: string) => {
    setDrawerOpen(false);
    setBrowseFolder(folder);
    setView("browse");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goUpload = useCallback(() => {
    setDrawerOpen(false);
    setView("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { state, play: playTrack, toggle, seekBy, seekTo, setSpeed, setSleep } = usePlayer();

  const play = useCallback(
    (t: Track) => {
      markPlayed(t.id).catch((e) => console.error(e));
      const playedAt = new Date().toISOString();
      setTracks((ts) => {
        const next = ts.map((x) => (x.id === t.id ? { ...x, last_played_at: playedAt } : x));
        cacheTrackList(next);
        return next;
      });
      playTrack(t);
    },
    [playTrack]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    seedDefaultFoldersIfEmpty()
      .then(setFolders)
      .catch((e) => console.error(e));
  }, [session]);

  const handleKeepOffline = useCallback(async (t: Track, durationMs: number | null) => {
    setSaving((s) => new Set(s).add(t.id));
    try {
      await saveOffline(t, durationMs);
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

  const handleRemoveOffline = useCallback(async (t: Track) => {
    await removeOffline(t.id);
    setOffline(await loadOfflineIds());
  }, []);

  const handleRename = useCallback(async (t: Track, title: string) => {
    try {
      await renameTrack(t.id, title);
      setTracks((ts) => {
        const next = ts.map((x) => (x.id === t.id ? { ...x, title } : x));
        cacheTrackList(next);
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Couldn't rename — check your connection.");
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

  const handleCreateFolder = useCallback(async (name: string) => {
    try {
      const f = await createFolder(name);
      setFolders((fs) => [...fs, f].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Couldn't create folder.");
    }
  }, []);

  const handleRenameFolder = useCallback(async (f: FolderRow, newName: string) => {
    try {
      await renameFolder(f.id, f.name, newName);
      setFolders((fs) =>
        fs.map((x) => (x.id === f.id ? { ...x, name: newName } : x)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setTracks((ts) => {
        const next = ts.map((t) => (t.folder === f.name ? { ...t, folder: newName } : t));
        cacheTrackList(next);
        return next;
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Couldn't rename folder.");
    }
  }, []);

  const handleDeleteFolder = useCallback(async (f: FolderRow) => {
    try {
      await deleteFolder(f.id, f.name);
      setFolders((fs) => fs.filter((x) => x.id !== f.id));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Couldn't delete folder.");
    }
  }, []);

  if (session === undefined) {
    return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  }
  if (!session) {
    return <Gate />;
  }

  return (
    <div
      className="mesh-gradient mx-auto min-h-dvh max-w-xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-bg/60 px-4 backdrop-blur-md"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(3.5rem + env(safe-area-inset-top, 0px))"
        }}
      >
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-on-surface-dim transition-colors duration-200 hover:text-primary active:scale-90"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            title="Menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Hey Ibu 👋
          </h1>
        </div>
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

      {/* Sidebar drawer */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-brand ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <nav
        className={`fixed top-0 left-0 z-[70] flex h-full w-72 max-w-[80%] flex-col border-r border-white/10 bg-surface shadow-2xl transition-transform duration-300 ease-brand ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-label="Main menu"
      >
        <div className="flex h-14 items-center px-4">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Adios
          </span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2">
          <div className="flex items-center rounded-xl hover:bg-white/5">
            <button
              className={`flex flex-1 items-center gap-3 px-3 py-3 text-left transition-colors ${
                view === "home" ? "text-primary" : "text-on-surface"
              }`}
              onClick={goHome}
            >
              <span className="material-symbols-outlined is-filled">library_music</span>
              <span className="font-semibold">Library</span>
            </button>
            <button
              className="flex h-11 w-11 flex-none items-center justify-center text-on-surface-dim"
              onClick={() => setLibraryExpanded((v) => !v)}
              aria-label={libraryExpanded ? "Collapse folders" : "Expand folders"}
              aria-expanded={libraryExpanded}
            >
              <span className="material-symbols-outlined">
                {libraryExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>

          {libraryExpanded && (
            <div className="ml-6 flex flex-col gap-0.5 border-l border-white/10 pl-3">
              <button
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                  view === "browse" && browseFolder === "all"
                    ? "font-semibold text-primary"
                    : "text-on-surface-dim"
                }`}
                onClick={() => goBrowse("all")}
              >
                All
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    view === "browse" && browseFolder === f.name
                      ? "font-semibold text-primary"
                      : "text-on-surface-dim"
                  }`}
                  onClick={() => goBrowse(f.name)}
                >
                  {folderLabel(f.name)}
                </button>
              ))}
            </div>
          )}

          <button
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/5 ${
              view === "upload" ? "text-primary" : "text-on-surface"
            }`}
            onClick={goUpload}
          >
            <span className="material-symbols-outlined">upload_file</span>
            <span className="font-semibold">Upload</span>
          </button>
        </div>
      </nav>

      <main className="animate-app-in space-y-6 px-4 pt-4">
        {view === "home" && (
          <Library
            playedOnly
            tracks={tracks}
            folders={folders}
            currentId={state.track?.id ?? null}
            offlineIds={offline}
            savingOffline={saving}
            onPlay={play}
            onKeepOffline={handleKeepOffline}
            onRemoveOffline={handleRemoveOffline}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        )}
        {view === "browse" && (
          <Library
            key={browseFolder}
            playedOnly={false}
            initialFilter={browseFolder}
            tracks={tracks}
            folders={folders}
            currentId={state.track?.id ?? null}
            offlineIds={offline}
            savingOffline={saving}
            onPlay={play}
            onKeepOffline={handleKeepOffline}
            onRemoveOffline={handleRemoveOffline}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        )}
        {view === "upload" && (
          <Upload
            folders={folders}
            onUploaded={(t) =>
              setTracks((ts) => {
                const next = [t, ...ts];
                cacheTrackList(next);
                return next;
              })
            }
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        )}
      </main>

      <Player
        state={state}
        onToggle={toggle}
        onSeekBy={seekBy}
        onSeekTo={seekTo}
        onSpeed={setSpeed}
        onSleep={setSleep}
      />

      <button
        className={`fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-black/30 transition-all duration-200 ease-brand active:scale-90 ${
          showBackToTop ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)" }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top"
      >
        <span className="material-symbols-outlined text-2xl">arrow_upward</span>
      </button>
    </div>
  );
}
