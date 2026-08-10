import { useEffect, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  listTracks,
  deleteTrack,
  renameTrack,
  reorderTrack,
  moveTrack,
  markPlayed,
  getStorageUsage,
  seedDefaultFoldersIfEmpty,
  createFolder,
  renameFolder,
  deleteFolder,
  deleteFolderCascade
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
import { SalahView } from "./components/salah/SalahView";
import { AppPicker } from "./components/AppPicker";
import { resolveDefaultApp } from "./lib/appMode";

type Theme = "dark" | "light";
type AppChoice = "picker" | "adios" | "salah";

const DEFAULT_APP = resolveDefaultApp();

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [app, setApp] = useState<AppChoice>(DEFAULT_APP);
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
  const [storageBytes, setStorageBytes] = useState<number | null>(null);

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

  const handleTrackChange = useCallback((t: Track) => {
    markPlayed(t.id).catch((e) => console.error(e));
    const playedAt = new Date().toISOString();
    setTracks((ts) => {
      const next = ts.map((x) => (x.id === t.id ? { ...x, last_played_at: playedAt } : x));
      cacheTrackList(next);
      return next;
    });
  }, []);

  const {
    state,
    playQueue,
    next: playNext,
    prev: playPrev,
    jumpTo,
    toggleShuffle,
    cycleLoop,
    toggle,
    seekBy,
    seekTo,
    setSpeed,
    setSleep
  } = usePlayer(handleTrackChange);

  const play = useCallback(
    (t: Track, queue: Track[]) => {
      const idx = queue.findIndex((x) => x.id === t.id);
      playQueue(queue, idx >= 0 ? idx : 0);
    },
    [playQueue]
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
    getStorageUsage()
      .then(setStorageBytes)
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

  const handleReorder = useCallback(async (t: Track, sortOrder: number) => {
    setTracks((ts) => {
      const next = ts.map((x) => (x.id === t.id ? { ...x, sort_order: sortOrder } : x));
      cacheTrackList(next);
      return next;
    });
    try {
      await reorderTrack(t.id, sortOrder);
    } catch (e) {
      console.error(e);
      alert("Couldn't save the new order — check your connection.");
    }
  }, []);

  const handleMoveTrack = useCallback(async (t: Track, folder: string) => {
    try {
      await moveTrack(t.id, folder);
      setTracks((ts) => {
        const next = ts.map((x) => (x.id === t.id ? { ...x, folder, sort_order: -Date.now() } : x));
        cacheTrackList(next);
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Couldn't move the track — check your connection.");
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
    getStorageUsage()
      .then(setStorageBytes)
      .catch((e) => console.error(e));
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

  const handleDeleteFolder = useCallback(
    async (f: FolderRow) => {
      const inFolder = tracks.filter((t) => t.folder === f.name);
      if (inFolder.length === 0) {
        try {
          await deleteFolder(f.id, f.name);
          setFolders((fs) => fs.filter((x) => x.id !== f.id));
        } catch (e) {
          console.error(e);
          alert(e instanceof Error ? e.message : "Couldn't delete folder.");
        }
        return;
      }

      const count = inFolder.length;
      const confirmed = confirm(
        `"${folderLabel(f.name)}" has ${count} track${count === 1 ? "" : "s"}. Delete the folder AND all ${count} track${count === 1 ? "" : "s"} — audio files included? This cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await deleteFolderCascade(f.id, f.name);
        setFolders((fs) => fs.filter((x) => x.id !== f.id));
        const removedIds = new Set(inFolder.map((t) => t.id));
        setTracks((ts) => {
          const next = ts.filter((t) => !removedIds.has(t.id));
          cacheTrackList(next);
          return next;
        });
        await Promise.all(inFolder.map((t) => removeOffline(t.id)));
        setOffline(await loadOfflineIds());
        getStorageUsage()
          .then(setStorageBytes)
          .catch((e) => console.error(e));
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Couldn't delete folder.");
      }
    },
    [tracks]
  );

  if (session === undefined) {
    return <main className="min-h-dvh bg-bg" aria-busy="true" />;
  }
  if (!session) {
    return <Gate />;
  }
  if (app === "picker") {
    return <AppPicker onSelect={setApp} />;
  }

  if (app === "salah") {
    return (
      <div className="salah-app">
        <SalahView
          onSwitchApp={DEFAULT_APP === "picker" ? () => setApp("picker") : undefined}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <Player
          lifted
          state={state}
          onToggle={toggle}
          onSeekBy={seekBy}
          onSeekTo={seekTo}
          onSpeed={setSpeed}
          onSleep={setSleep}
          onNext={playNext}
          onPrev={playPrev}
          onJumpTo={jumpTo}
          onToggleShuffle={toggleShuffle}
          onCycleLoop={cycleLoop}
        />
      </div>
    );
  }

  return (
    <div
      className="mesh-gradient mx-auto min-h-dvh max-w-xl"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6rem)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-surface/80 px-4 backdrop-blur-xl"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(4rem + env(safe-area-inset-top, 0px))",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)"
        }}
      >
        <div className="flex items-center gap-3">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-200 active:bg-surface-variant"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            title="Menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <h1 className="font-headline bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg tracking-tight text-transparent">
            Hey Ibu 👋
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-200 active:bg-surface-variant"
            onClick={() => setApp("picker")}
            aria-label="Switch app"
            title="Switch app"
          >
            <span className="material-symbols-outlined text-xl">apps</span>
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-200 active:bg-surface-variant"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </header>

      {/* Sidebar drawer */}
      <div
        className={`fixed inset-0 z-[60] bg-surface/80 backdrop-blur-sm transition-opacity duration-300 ease-brand ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <nav
        className={`fixed top-0 left-0 z-[70] flex h-full w-72 max-w-[80%] flex-col bg-surface-container shadow-2xl transition-transform duration-300 ease-brand ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        aria-label="Main menu"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant/40 p-4 pt-8">
          <span className="text-2xl" aria-hidden="true">🎧</span>
          <span className="font-headline bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg tracking-tight text-transparent">
            ADIOS
          </span>
          <button
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors active:bg-surface-variant"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-1 px-2 py-4">
          <div
            className={`flex items-center rounded-xl transition-colors ${view === "home" ? "bg-surface-variant/50" : ""}`}
          >
            <button
              className={`flex flex-1 items-center gap-3 px-3 py-3 text-left transition-colors ${
                view === "home" ? "text-on-surface" : "text-on-surface-variant"
              }`}
              onClick={goHome}
            >
              <span className={`material-symbols-outlined ${view === "home" ? "is-filled text-primary" : ""}`}>
                library_music
              </span>
              <span className="text-sm font-medium">Library</span>
            </button>
            <button
              className="flex h-11 w-11 flex-none items-center justify-center text-on-surface-variant"
              onClick={() => setLibraryExpanded((v) => !v)}
              aria-label={libraryExpanded ? "Collapse folders" : "Expand folders"}
              aria-expanded={libraryExpanded}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${libraryExpanded ? "rotate-180" : ""}`}
              >
                expand_more
              </span>
            </button>
          </div>

          {libraryExpanded && (
            <div className="flex flex-col gap-1 py-1 pr-3 pl-11">
              <button
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-variant ${
                  view === "browse" && browseFolder === "all"
                    ? "font-medium text-on-surface"
                    : "text-on-surface-variant"
                }`}
                onClick={() => goBrowse("all")}
              >
                <span className="material-symbols-outlined text-[18px] transition-colors group-hover:text-secondary">
                  folder
                </span>
                <span className="text-sm">All</span>
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-variant ${
                    view === "browse" && browseFolder === f.name
                      ? "font-medium text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                  onClick={() => goBrowse(f.name)}
                >
                  <span className="material-symbols-outlined text-[18px] transition-colors group-hover:text-secondary">
                    folder
                  </span>
                  <span className="text-sm">{folderLabel(f.name)}</span>
                </button>
              ))}
            </div>
          )}

          <button
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-variant ${
              view === "upload" ? "text-on-surface" : "text-on-surface-variant"
            }`}
            onClick={goUpload}
          >
            <span className="material-symbols-outlined">cloud_upload</span>
            <span className="text-sm font-medium">Upload</span>
          </button>
        </div>

        <div className="mt-auto border-t border-outline-variant/40 bg-surface-container-low/50 p-4">
          {storageBytes !== null && (
            <>
              {(() => {
                const cap = 1_000_000_000; // Supabase free tier: 1 GB
                const pct = Math.min(100, (storageBytes / cap) * 100);
                const usedMb = (storageBytes / 1_000_000).toFixed(0);
                const capMb = (cap / 1_000_000).toFixed(0);
                return (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant">Storage</span>
                      <span className="text-xs text-primary">
                        {usedMb} MB / {capMb} MB
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 90 ? "bg-error" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </nav>

      <main className="animate-app-in space-y-6 px-4 pt-4">
        {view === "home" && (
          <Library
            playedOnly
            onBrowseFolder={goBrowse}
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
            onMoveTrack={handleMoveTrack}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
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
            onReorder={handleReorder}
            onMoveTrack={handleMoveTrack}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        )}
        {view === "upload" && (
          <Upload
            folders={folders}
            onUploaded={(t) => {
              setTracks((ts) => {
                const next = [t, ...ts];
                cacheTrackList(next);
                return next;
              });
              getStorageUsage()
                .then(setStorageBytes)
                .catch((e) => console.error(e));
            }}
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
        onNext={playNext}
        onPrev={playPrev}
        onJumpTo={jumpTo}
        onToggleShuffle={toggleShuffle}
        onCycleLoop={cycleLoop}
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
