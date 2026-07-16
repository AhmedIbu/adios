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

const FOLDER_COLOR: Record<Folder, string> = {
  music: "accent-music",
  lectures: "accent-lectures",
  notes: "accent-notes"
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
    <section className="library">
      <input
        className="library__search"
        type="search"
        placeholder="Search your audio…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search tracks"
      />

      <nav className="library__chips" aria-label="Folders">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            className={`library__chip ${filter === f.id ? "library__chip--on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {visible.length === 0 && (
        <p className="library__empty">
          {tracks.length === 0
            ? "Your shelf is empty. Upload your first audio below."
            : "Nothing matches — try another folder or search."}
        </p>
      )}

      <ul className="library__list">
        {visible.map((t) => {
          const kept = offlineIds.has(t.id);
          const saving = savingOffline.has(t.id);
          return (
            <li
              key={t.id}
              className={`track ${currentId === t.id ? "track--current" : ""}`}
            >
              <button
                className={`track__play track__play--${FOLDER_COLOR[t.folder]}`}
                onClick={() => onPlay(t)}
                aria-label={`Play ${t.title}`}
              >
                ▶
              </button>
              <button className="track__body" onClick={() => onPlay(t)}>
                <span className="track__title">{t.title}</span>
                <span className="track__meta">
                  {fmtTime(t.duration)}
                  {t.position > 5 && t.duration - t.position > 5 && (
                    <> · resume {fmtTime(t.position)}</>
                  )}
                  {kept && <> · saved offline</>}
                </span>
              </button>
              <button
                className={`track__offline ${kept ? "track__offline--on" : ""}`}
                onClick={() => onToggleOffline(t)}
                disabled={saving}
                aria-label={kept ? "Remove offline copy" : "Keep offline"}
                title={kept ? "Remove offline copy" : "Keep offline"}
              >
                {saving ? "…" : kept ? "✓" : "↓"}
              </button>
              <button
                className="track__delete"
                onClick={() => onDelete(t)}
                aria-label={`Delete ${t.title}`}
                title="Delete"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
