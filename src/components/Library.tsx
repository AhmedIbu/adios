import { useState } from "react";
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
  { icon: string; tile: string; iconColor: string; playBg: string }
> = {
  music: {
    icon: "library_music",
    tile: "bg-primary-container/20 border-primary-container/30",
    iconColor: "text-primary-container",
    playBg: "bg-primary-container text-on-primary-container"
  },
  lectures: {
    icon: "school",
    tile: "bg-secondary-container/20 border-secondary-container/30",
    iconColor: "text-secondary",
    playBg: "bg-secondary-container text-on-secondary-container"
  },
  notes: {
    icon: "description",
    tile: "bg-tertiary-container/20 border-tertiary-container/30",
    iconColor: "text-tertiary",
    playBg: "bg-tertiary-container text-on-tertiary-container"
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

  const visible = tracks.filter(
    (t) =>
      (filter === "all" || t.folder === filter) &&
      t.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section>
      {/* Folder quick-access grid */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {(["music", "lectures", "notes"] as Folder[]).map((f) => {
          const style = FOLDER_STYLE[f];
          const on = filter === f;
          return (
            <button
              key={f}
              className="group text-center transition-transform duration-200 active:scale-[0.97]"
              onClick={() => setFilter(on ? "all" : f)}
            >
              <div
                className={`mb-2 flex aspect-square items-center justify-center rounded-2xl border transition-colors ${style.tile} ${
                  on ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className={`material-symbols-outlined text-4xl ${style.iconColor}`}>
                  {style.icon}
                </span>
              </div>
              <p className="text-sm font-medium text-on-surface capitalize">{f}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <input
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
          return (
            <li
              key={t.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-200 ${
                isCurrent
                  ? "border-primary/50 bg-white/10"
                  : "border-white/5 bg-white/5 hover:bg-white/10"
              }`}
            >
              <button
                className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${style.playBg} shadow-md`}
                onClick={() => onPlay(t)}
                aria-label={`Play ${t.title}`}
              >
                <span className="material-symbols-outlined is-filled text-2xl">play_arrow</span>
              </button>
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => onPlay(t)}
              >
                <p className="truncate font-semibold text-on-surface">{t.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-dim">
                  {kept && (
                    <span className="material-symbols-outlined is-filled text-primary text-sm">
                      offline_pin
                    </span>
                  )}
                  <span>{fmtTime(t.duration)}</span>
                  {t.position > 5 && t.duration - t.position > 5 && (
                    <span>· resume {fmtTime(t.position)}</span>
                  )}
                </div>
              </button>
              <button
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors duration-200 ${
                  kept
                    ? "bg-primary text-on-primary"
                    : "bg-surface-high text-on-surface-dim hover:text-primary"
                }`}
                onClick={() => onToggleOffline(t)}
                disabled={saving}
                aria-label={kept ? "Remove offline copy" : "Keep offline"}
                title={kept ? "Remove offline copy" : "Keep offline"}
              >
                <span className="material-symbols-outlined text-lg">
                  {saving ? "more_horiz" : kept ? "check" : "download"}
                </span>
              </button>
              <button
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-on-surface-dim transition-colors duration-200 hover:text-error"
                onClick={() => onDelete(t)}
                aria-label={`Delete ${t.title}`}
                title="Delete"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
