import { useEffect, useRef, useState } from "react";
import type { Track, Folder } from "../lib/types";
import { FOLDERS, fmtTime } from "../lib/types";

interface Props {
  tracks: Track[];
  currentId: string | null;
  offlineIds: Set<string>;
  savingOffline: Set<string>;
  onPlay: (t: Track) => void;
  onToggleOffline: (t: Track) => void;
  onDelete: (t: Track) => void;
}

const FOLDER_STYLE: Record<
  Folder,
  { icon: string; gradient: string; glow: string; iconColor: string; delay: string }
> = {
  music: {
    icon: "library_music",
    gradient: "from-[#2e6385] to-[#00344d]",
    glow: "shadow-[0_4px_20px_-5px_rgba(154,204,243,0.3)]",
    iconColor: "text-primary",
    delay: "0s"
  },
  lectures: {
    icon: "school",
    gradient: "from-[#513c71] to-[#250f43]",
    glow: "shadow-[0_4px_20px_-5px_rgba(213,187,249,0.3)]",
    iconColor: "text-secondary",
    delay: "0.5s"
  },
  notes: {
    icon: "description",
    gradient: "from-[#624000] to-[#291800]",
    glow: "shadow-[0_4px_20px_-5px_rgba(241,190,117,0.3)]",
    iconColor: "text-tertiary",
    delay: "1s"
  }
};

export function Library({
  tracks,
  currentId,
  offlineIds,
  savingOffline,
  onPlay,
  onToggleOffline,
  onDelete
}: Props) {
  const [filter, setFilter] = useState<Folder | "all">("all");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const visible = tracks.filter(
    (t) =>
      (filter === "all" || t.folder === filter) &&
      t.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section>
      {/* Folder quick-access grid */}
      <div className="mb-6">
        <h2 className="mb-3 text-xl font-bold tracking-tight text-on-surface">Folders</h2>
        <div className="grid grid-cols-3 gap-3">
          {(["music", "lectures", "notes"] as Folder[]).map((f) => {
            const style = FOLDER_STYLE[f];
            const count = tracks.filter((t) => t.folder === f).length;
            const on = filter === f;
            return (
              <button
                key={f}
                className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br transition-transform duration-200 active:scale-95 ${style.gradient} ${style.glow} ${
                  on ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setFilter(on ? "all" : f)}
              >
                <div
                  className="animate-float mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"
                  style={{ animationDelay: style.delay }}
                >
                  <span className={`material-symbols-outlined is-filled text-2xl ${style.iconColor}`}>
                    {style.icon}
                  </span>
                </div>
                <p className="text-xs font-bold tracking-wide text-white capitalize">{f}</p>
                <span className="text-[8px] font-medium tracking-tighter text-white/60 uppercase">
                  {count} {count === 1 ? "Track" : "Tracks"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
      <nav className="mb-4 flex gap-2 overflow-x-auto" aria-label="Folders">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              filter === f.id
                ? "bg-primary text-on-primary"
                : "bg-surface-glass text-on-surface-dim hover:text-on-surface"
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <h2 className="mb-3 text-xl font-bold tracking-tight text-on-surface">Recent Tracks</h2>

      {visible.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-on-surface-dim">
          {tracks.length === 0
            ? "Your shelf is empty. Upload your first audio below."
            : "Nothing matches — try another folder or search."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {visible.map((t) => {
          const style = FOLDER_STYLE[t.folder];
          const kept = offlineIds.has(t.id);
          const saving = savingOffline.has(t.id);
          const isCurrent = currentId === t.id;
          const menuOpen = openMenu === t.id;
          return (
            <li
              key={t.id}
              className={`relative flex items-center gap-3 rounded-2xl border p-2.5 backdrop-blur-md transition-colors duration-200 ${
                isCurrent ? "border-primary/50 bg-white/8" : "border-white/8 bg-white/3"
              }`}
            >
              <button
                className={`group relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br shadow-lg ${style.gradient}`}
                onClick={() => onPlay(t)}
                aria-label={`Play ${t.title}`}
              >
                <span className={`material-symbols-outlined is-filled text-xl ${style.iconColor} opacity-70 transition-opacity group-hover:opacity-0`}>
                  {style.icon}
                </span>
                <span className="material-symbols-outlined is-filled absolute text-xl text-white opacity-0 transition-opacity group-hover:opacity-100">
                  play_arrow
                </span>
              </button>
              <button className="min-w-0 flex-1 text-left" onClick={() => onPlay(t)}>
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
                  <p className="text-[10px] font-medium tracking-tighter text-on-surface-dim/80 uppercase">
                    {fmtTime(t.duration)} · {t.folder}
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
                  setOpenMenu(menuOpen ? null : t.id);
                }}
                aria-label={`More options for ${t.title}`}
                aria-expanded={menuOpen}
              >
                <span className="material-symbols-outlined text-xl">more_vert</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute top-12 right-2 z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => {
                      onToggleOffline(t);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {saving ? "more_horiz" : kept ? "check_circle" : "download"}
                    </span>
                    {kept ? "Remove offline copy" : "Keep offline"}
                  </button>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
