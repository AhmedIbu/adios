import { useEffect, useRef, useState } from "react";
import type { Track, Folder } from "../lib/types";
import { folderLabel, fmtTime } from "../lib/types";
import type { FolderRow } from "../lib/supabase";
import { vibrate } from "../lib/haptics";

interface Props {
  tracks: Track[];
  folders: FolderRow[];
  currentId: string | null;
  offlineIds: Set<string>;
  savingOffline: Set<string>;
  onPlay: (t: Track, queue: Track[]) => void;
  onKeepOffline: (t: Track, durationMs: number | null) => void;
  onRemoveOffline: (t: Track) => void;
  onDelete: (t: Track) => void;
  onRename: (t: Track, title: string) => void;
  onMoveTrack?: (t: Track, folder: string) => void;
  /** Browse mode only: persist a track's new position within its folder. */
  onReorder?: (t: Track, sortOrder: number) => void;
  onRenameFolder?: (f: FolderRow, newName: string) => void;
  onDeleteFolder?: (f: FolderRow) => void;
  /** Home mode: only tracks with a play history; folder tiles jump to Browse instead of filtering in place. */
  playedOnly: boolean;
  /** Browse mode: starting folder filter, set from the sidebar's Library dropdown. */
  initialFilter?: Folder | "all";
  /** Home mode only: navigate to a full Browse view for this folder. */
  onBrowseFolder?: (folder: string) => void;
}

/**
 * Call once per component. Returns bind(onLongPress, onClick) which can be
 * called freely inside .map() — it's a plain closure factory, not a hook,
 * so it doesn't run into the Rules of Hooks despite being used per-row.
 * Only one press gesture can be active at a time, so sharing the
 * underlying refs across every row/tile is safe.
 */
function useLongPressBinder(delay = 500) {
  const timer = useRef<number | null>(null);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  function cancel() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return function bind(onLongPress: () => void, onClick: () => void) {
    return {
      onPointerDown(e: React.PointerEvent) {
        moved.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          timer.current = null;
          onLongPress();
        }, delay);
      },
      onPointerMove(e: React.PointerEvent) {
        if (timer.current === null) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (Math.hypot(dx, dy) > 10) {
          moved.current = true;
          cancel();
        }
      },
      onPointerUp() {
        const firedLongPress = timer.current === null && !moved.current;
        cancel();
        if (!firedLongPress && !moved.current) onClick();
      },
      onPointerLeave: cancel
    };
  };
}

const OFFLINE_DURATIONS: { label: string; ms: number | null }[] = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "12 hours", ms: 12 * 60 * 60 * 1000 },
  { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Forever", ms: null }
];

interface FolderStyle {
  icon: string;
  gradient: string;
  glow: string;
  iconColor: string;
  delay: string;
}

const KNOWN_FOLDER_STYLE: Record<string, FolderStyle> = {
  music: {
    icon: "library_music",
    gradient: "from-[#2e6385] to-[#00344d]",
    glow: "shadow-[0_4px_20px_-5px_rgba(154,204,243,0.3)]",
    iconColor: "text-primary",
    delay: "0s"
  },
  "beginning-to-the-end": {
    icon: "auto_stories",
    gradient: "from-[#513c71] to-[#250f43]",
    glow: "shadow-[0_4px_20px_-5px_rgba(213,187,249,0.3)]",
    iconColor: "text-secondary",
    delay: "0.2s"
  },
  "emotional-reminders": {
    icon: "favorite",
    gradient: "from-[#7a3b56] to-[#3d1a2b]",
    glow: "shadow-[0_4px_20px_-5px_rgba(240,150,180,0.3)]",
    iconColor: "text-[#f0a8bf]",
    delay: "0.4s"
  },
  "lessons-from-quran": {
    icon: "menu_book",
    gradient: "from-[#2e6355] to-[#0f2e26]",
    glow: "shadow-[0_4px_20px_-5px_rgba(120,210,180,0.3)]",
    iconColor: "text-[#78d2b4]",
    delay: "0.6s"
  },
  "motivational-reminders": {
    icon: "bolt",
    gradient: "from-[#7a5a2e] to-[#3d2a0f]",
    glow: "shadow-[0_4px_20px_-5px_rgba(253,201,127,0.3)]",
    iconColor: "text-tertiary",
    delay: "0.8s"
  },
  "powerful-reminders": {
    icon: "local_fire_department",
    gradient: "from-[#7a2e2e] to-[#3d0f0f]",
    glow: "shadow-[0_4px_20px_-5px_rgba(255,150,150,0.3)]",
    iconColor: "text-[#ff9696]",
    delay: "1s"
  },
  notes: {
    icon: "description",
    gradient: "from-[#624000] to-[#291800]",
    glow: "shadow-[0_4px_20px_-5px_rgba(241,190,117,0.3)]",
    iconColor: "text-tertiary",
    delay: "1.2s"
  }
};

/** New user-created folders cycle through this palette, picked deterministically by name. */
const FALLBACK_STYLES: FolderStyle[] = [
  {
    icon: "folder",
    gradient: "from-[#2e5f6a] to-[#0f2a30]",
    glow: "shadow-[0_4px_20px_-5px_rgba(154,220,243,0.3)]",
    iconColor: "text-[#9cdcf3]",
    delay: "0s"
  },
  {
    icon: "folder",
    gradient: "from-[#5f6a2e] to-[#2a300f]",
    glow: "shadow-[0_4px_20px_-5px_rgba(220,243,154,0.3)]",
    iconColor: "text-[#dcf39c]",
    delay: "0.3s"
  },
  {
    icon: "folder",
    gradient: "from-[#6a2e5f] to-[#300f2a]",
    glow: "shadow-[0_4px_20px_-5px_rgba(243,154,220,0.3)]",
    iconColor: "text-[#f39cdc]",
    delay: "0.6s"
  }
];

function styleFor(name: string): FolderStyle {
  if (KNOWN_FOLDER_STYLE[name]) return KNOWN_FOLDER_STYLE[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_STYLES[hash % FALLBACK_STYLES.length];
}

const PAGE_SIZE = 5;

export function Library({
  tracks,
  folders,
  currentId,
  offlineIds,
  savingOffline,
  onPlay,
  onKeepOffline,
  onRemoveOffline,
  onDelete,
  onRename,
  onMoveTrack,
  onReorder,
  onRenameFolder,
  onDeleteFolder,
  playedOnly,
  initialFilter,
  onBrowseFolder
}: Props) {
  const [filter, setFilter] = useState<Folder | "all">(initialFilter ?? "all");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuMode, setMenuMode] = useState<"main" | "offline" | "move">("main");
  const [showAll, setShowAll] = useState(false);
  const [renaming, setRenaming] = useState<Track | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [folderMenu, setFolderMenu] = useState<FolderRow | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderRow | null>(null);
  const [folderNameValue, setFolderNameValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const bindLongPress = useLongPressBinder();

  // Drag-to-reorder (Browse mode, single folder only — query.length===0 keeps
  // the dragged list's positions meaningful against the real folder order).
  const canReorder = !playedOnly && filter !== "all" && query.length === 0 && !!onReorder;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const rowRectsRef = useRef<{ id: string; top: number; height: number }[]>([]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  function toggleMenu(id: string) {
    setMenuMode("main");
    setOpenMenu((cur) => (cur === id ? null : id));
  }

  useEffect(() => {
    setShowAll(false);
  }, [filter, query]);

  const visible = tracks
    .filter(
      (t) =>
        (!playedOnly || t.last_played_at) &&
        (filter === "all" || t.folder === filter) &&
        t.title.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (playedOnly) {
        return new Date(b.last_played_at!).getTime() - new Date(a.last_played_at!).getTime();
      }
      if (filter !== "all" && a.sort_order !== null && b.sort_order !== null) {
        return a.sort_order - b.sort_order;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  // Reordering only makes sense against the full folder, not a paginated slice.
  const displayed = canReorder || showAll ? visible : visible.slice(0, PAGE_SIZE);
  const heading = playedOnly ? "Recently Played" : filter === "all" ? "All Tracks" : folderLabel(filter);

  const rows =
    dragId !== null && overIndex !== null
      ? (() => {
          const fromIdx = displayed.findIndex((t) => t.id === dragId);
          if (fromIdx === -1) return displayed;
          const next = [...displayed];
          const [item] = next.splice(fromIdx, 1);
          next.splice(overIndex, 0, item);
          return next;
        })()
      : displayed;

  function beginDrag(id: string) {
    rowRectsRef.current = displayed.map((t) => {
      const el = rowRefs.current.get(t.id);
      const rect = el?.getBoundingClientRect();
      return { id: t.id, top: rect?.top ?? 0, height: rect?.height ?? 0 };
    });
    setDragId(id);
    setOverIndex(displayed.findIndex((t) => t.id === id));
  }

  function dragMove(clientY: number) {
    const rects = rowRectsRef.current;
    let idx = rects.length - 1;
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].top + rects[i].height / 2) {
        idx = i;
        break;
      }
    }
    setOverIndex(idx);
  }

  function endDrag() {
    if (dragId !== null && onReorder) {
      const finalTrack = displayed.find((t) => t.id === dragId);
      const pos = rows.findIndex((t) => t.id === dragId);
      if (finalTrack && pos !== -1) {
        const prevOrder = rows[pos - 1]?.sort_order ?? null;
        const nextOrder = rows[pos + 1]?.sort_order ?? null;
        let newOrder: number;
        if (prevOrder !== null && nextOrder !== null) newOrder = (prevOrder + nextOrder) / 2;
        else if (prevOrder !== null) newOrder = prevOrder + 1;
        else if (nextOrder !== null) newOrder = nextOrder - 1;
        else newOrder = 0;
        onReorder(finalTrack, newOrder);
      }
    }
    setDragId(null);
    setOverIndex(null);
  }

  const dragMoveRef = useRef(dragMove);
  dragMoveRef.current = dragMove;
  const endDragRef = useRef(endDrag);
  endDragRef.current = endDrag;

  useEffect(() => {
    if (dragId === null) return;
    const onMove = (e: PointerEvent) => dragMoveRef.current(e.clientY);
    const onUp = () => endDragRef.current();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  return (
    <section>
      {/* Folder quick-access grid */}
      <div className="mb-6">
        <h2 className="mb-3 text-xl font-bold tracking-tight text-on-surface">Folders</h2>
        <div className="grid grid-cols-3 gap-3">
          {folders.map((folder) => {
            const f = folder.name;
            const style = styleFor(f);
            const count = tracks.filter((t) => t.folder === f).length;
            const on = filter === f;
            return (
              <button
                key={folder.id}
                className={`group relative flex aspect-square touch-none flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br transition-transform duration-200 active:scale-95 ${style.gradient} ${style.glow} ${
                  on ? "ring-2 ring-primary" : ""
                }`}
                {...bindLongPress(
                  () => {
                    vibrate(15);
                    setFolderMenu(folder);
                  },
                  () => (playedOnly ? onBrowseFolder?.(f) : setFilter(on ? "all" : f))
                )}
              >
                <div
                  className="animate-float mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"
                  style={{ animationDelay: style.delay }}
                >
                  <span className={`material-symbols-outlined is-filled text-2xl ${style.iconColor}`}>
                    {style.icon}
                  </span>
                </div>
                <p className="px-1 text-center text-xs leading-tight font-bold text-white">
                  {folderLabel(f)}
                </p>
                <span className="text-[8px] font-medium tracking-tighter text-white/60 uppercase">
                  {count} {count === 1 ? "Track" : "Tracks"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!playedOnly && (
        <>
          {/* Search */}
          <input
            ref={searchRef}
            id="library-search"
            className="mb-3 h-12 w-full rounded-xl border border-outline-dim bg-surface-glass px-4 text-on-surface transition-shadow duration-200 placeholder:text-on-surface-dim focus:ring-2 focus:ring-primary/20 focus:outline-none"
            type="search"
            placeholder="Search your audio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tracks"
          />

          {/* Folder chips */}
          <nav className="mb-4 flex gap-3 overflow-x-auto pb-1" aria-label="Folders">
            <button
              className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                filter === "all"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-glass text-on-surface-dim hover:text-on-surface"
              }`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                  filter === f.name
                    ? "bg-primary text-on-primary"
                    : "bg-surface-glass text-on-surface-dim hover:text-on-surface"
                }`}
                onClick={() => setFilter(f.name)}
              >
                {folderLabel(f.name)}
              </button>
            ))}
          </nav>
        </>
      )}

      <h2 className="mb-3 text-xl font-bold tracking-tight text-on-surface">{heading}</h2>

      {visible.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-on-surface-dim">
          {tracks.length === 0
            ? "Your shelf is empty. Upload your first audio from the menu."
            : playedOnly
              ? "Nothing played yet — open Library from the menu to browse and start listening."
              : "Nothing matches — try another folder or search."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((t) => {
          const style = styleFor(t.folder);
          const kept = offlineIds.has(t.id);
          const saving = savingOffline.has(t.id);
          const isCurrent = currentId === t.id;
          const menuOpen = openMenu === t.id;
          const isDragging = dragId === t.id;
          return (
            <li
              key={t.id}
              ref={(el) => {
                if (el) rowRefs.current.set(t.id, el);
                else rowRefs.current.delete(t.id);
              }}
              className={`relative flex items-center gap-3 rounded-2xl border p-2.5 backdrop-blur-md transition-colors duration-200 ${
                menuOpen ? "z-30" : "z-0"
              } ${isDragging ? "opacity-50" : ""} ${isCurrent ? "border-primary/50 bg-white/8" : "border-white/8 bg-white/3"}`}
            >
              {canReorder && (
                <button
                  className="flex h-8 w-6 flex-none touch-none items-center justify-center text-on-surface-dim active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    beginDrag(t.id);
                  }}
                  aria-label={`Drag to reorder ${t.title}`}
                >
                  <span className="material-symbols-outlined text-lg">drag_indicator</span>
                </button>
              )}
              <button
                className={`group relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br shadow-lg ${style.gradient}`}
                onClick={() => onPlay(t, visible)}
                aria-label={`Play ${t.title}`}
              >
                <span className={`material-symbols-outlined is-filled text-xl ${style.iconColor} opacity-70 transition-opacity group-hover:opacity-0`}>
                  {style.icon}
                </span>
                <span className="material-symbols-outlined is-filled absolute text-xl text-white opacity-0 transition-opacity group-hover:opacity-100">
                  play_arrow
                </span>
              </button>
              <button
                className="min-w-0 flex-1 touch-none text-left"
                {...bindLongPress(
                  () => {
                    vibrate(15);
                    toggleMenu(t.id);
                  },
                  () => onPlay(t, visible)
                )}
              >
                <p className="truncate text-base leading-tight font-bold text-on-surface">
                  {t.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined is-filled text-[12px] ${
                      kept ? "text-primary" : "text-on-surface-dim"
                    }`}
                  >
                    {kept ? "offline_pin" : "download"}
                  </span>
                  <p className="truncate text-[10px] font-medium tracking-tighter text-on-surface-dim/80 uppercase">
                    {fmtTime(t.duration)} · {folderLabel(t.folder)}
                    {t.position > 5 && t.duration - t.position > 5 && (
                      <> · resume {fmtTime(t.position)}</>
                    )}
                  </p>
                </div>
              </button>
              <button
                className="shrink-0 rounded-full p-1.5 text-on-surface-dim hover:bg-white/5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu(t.id);
                }}
                aria-label={`More options for ${t.title}`}
                aria-expanded={menuOpen}
              >
                <span className="material-symbols-outlined text-xl">more_vert</span>
              </button>

              {menuOpen && menuMode === "main" && (
                <div
                  className="absolute top-12 right-2 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
                    onClick={() => {
                      setRenaming(t);
                      setRenameValue(t.title);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Rename
                  </button>
                  {onMoveTrack && folders.length > 1 && (
                    <button
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuMode("move");
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">drive_file_move</span>
                      Move to…
                      <span className="material-symbols-outlined ml-auto text-lg">
                        chevron_right
                      </span>
                    </button>
                  )}
                  {kept ? (
                    <button
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5 disabled:opacity-50"
                      disabled={saving}
                      onClick={() => {
                        onRemoveOffline(t);
                        setOpenMenu(null);
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Remove offline copy
                    </button>
                  ) : (
                    <button
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5 disabled:opacity-50"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuMode("offline");
                      }}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {saving ? "more_horiz" : "download"}
                      </span>
                      Keep offline
                      <span className="material-symbols-outlined ml-auto text-lg">
                        chevron_right
                      </span>
                    </button>
                  )}
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-error hover:bg-white/5"
                    onClick={() => {
                      onDelete(t);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete
                  </button>
                </div>
              )}

              {menuOpen && menuMode === "offline" && (
                <div
                  className="absolute top-12 right-2 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-on-surface-dim uppercase hover:bg-white/5"
                    onClick={() => setMenuMode("main")}
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Keep offline for…
                  </button>
                  {OFFLINE_DURATIONS.map((d) => (
                    <button
                      key={d.label}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
                      onClick={() => {
                        onKeepOffline(t, d.ms);
                        setOpenMenu(null);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}

              {menuOpen && menuMode === "move" && (
                <div
                  className="absolute top-12 right-2 z-20 max-h-64 w-52 overflow-y-auto rounded-xl border border-white/10 bg-surface shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-on-surface-dim uppercase hover:bg-white/5"
                    onClick={() => setMenuMode("main")}
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Move to…
                  </button>
                  {folders
                    .filter((f) => f.name !== t.folder)
                    .map((f) => (
                      <button
                        key={f.id}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
                        onClick={() => {
                          onMoveTrack?.(t, f.name);
                          setOpenMenu(null);
                        }}
                      >
                        <span className="min-w-0 truncate">{folderLabel(f.name)}</span>
                      </button>
                    ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!canReorder && !showAll && visible.length > PAGE_SIZE && (
        <button
          className="mt-3 w-full rounded-xl bg-surface-glass py-3 text-sm font-semibold text-primary transition-colors hover:bg-white/10"
          onClick={() => setShowAll(true)}
        >
          Show all {visible.length} tracks
        </button>
      )}

      {renaming && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          onClick={() => setRenaming(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-bold text-on-surface">Rename track</h3>
            <input
              autoFocus
              className="mb-4 h-12 w-full rounded-lg border border-outline-dim bg-bg/40 px-4 text-on-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  onRename(renaming, renameValue.trim());
                  setRenaming(null);
                }
                if (e.key === "Escape") setRenaming(null);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-dim hover:bg-white/5"
                onClick={() => setRenaming(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                disabled={!renameValue.trim()}
                onClick={() => {
                  onRename(renaming, renameValue.trim());
                  setRenaming(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {folderMenu && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setFolderMenu(null)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <h3 className="px-5 py-3 text-center text-base font-semibold text-on-surface">
              {folderLabel(folderMenu.name)}
            </h3>
            <button
              className="flex w-full items-center gap-3 px-6 py-3.5 text-left text-on-surface hover:bg-white/5"
              onClick={() => {
                setRenamingFolder(folderMenu);
                setFolderNameValue(folderMenu.name);
                setFolderMenu(null);
              }}
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Rename
            </button>
            <button
              className="flex w-full items-center gap-3 px-6 py-3.5 text-left text-error hover:bg-white/5"
              onClick={() => {
                onDeleteFolder?.(folderMenu);
                setFolderMenu(null);
              }}
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Delete
            </button>
          </div>
        </div>
      )}

      {renamingFolder && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          onClick={() => setRenamingFolder(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-bold text-on-surface">Rename folder</h3>
            <input
              autoFocus
              className="mb-4 h-12 w-full rounded-lg border border-outline-dim bg-bg/40 px-4 text-on-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
              value={folderNameValue}
              onChange={(e) => setFolderNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && folderNameValue.trim()) {
                  onRenameFolder?.(renamingFolder, folderNameValue.trim());
                  setRenamingFolder(null);
                }
                if (e.key === "Escape") setRenamingFolder(null);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-dim hover:bg-white/5"
                onClick={() => setRenamingFolder(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                disabled={!folderNameValue.trim()}
                onClick={() => {
                  onRenameFolder?.(renamingFolder, folderNameValue.trim());
                  setRenamingFolder(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
