import { useEffect, useState } from "react";
import { DUAS } from "../../lib/content/duas";

const BOOKMARKS_KEY = "salah:bookmarked-duas";

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function SalahDuaLibrary() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => loadBookmarks());
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
    } catch {
      // ignore — bookmarks are a nice-to-have, not durable data
    }
  }, [bookmarks]);

  function toggleBookmark(id: string) {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visible = onlyBookmarked ? DUAS.filter((d) => bookmarks.has(d.id)) : DUAS;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-widest text-primary uppercase">
          Dua library
        </p>
        <button
          className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
          style={
            onlyBookmarked
              ? { background: "var(--s-primary)", color: "var(--s-on-primary)" }
              : { background: "rgba(255,255,255,0.06)", color: "var(--s-on-surface-variant)" }
          }
          onClick={() => setOnlyBookmarked((v) => !v)}
        >
          <span className="material-symbols-outlined is-filled text-[14px]">star</span>
          Bookmarked
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-on-surface-dim">
          No bookmarked duas yet — tap the star on any dua to save it here.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((d) => {
            const open = expandedId === d.id;
            const marked = bookmarks.has(d.id);
            return (
              <div key={d.id} className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="flex w-full items-center justify-between gap-2">
                  <button
                    className="flex flex-1 items-center justify-between text-left"
                    onClick={() => setExpandedId(open ? null : d.id)}
                  >
                    <span className="text-sm font-semibold text-on-surface">{d.title}</span>
                    <span className="material-symbols-outlined text-on-surface-dim/60">
                      {open ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  <button
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-transform active:scale-90"
                    onClick={() => toggleBookmark(d.id)}
                    aria-label={marked ? `Remove ${d.title} from bookmarks` : `Bookmark ${d.title}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${marked ? "is-filled" : ""}`}
                      style={{ color: marked ? "var(--s-secondary)" : "var(--s-on-surface-variant)" }}
                    >
                      star
                    </span>
                  </button>
                </div>
                {open && (
                  <div className="mt-2">
                    <p dir="rtl" className="mb-1 text-right text-lg leading-loose text-on-surface">
                      {d.arabic}
                    </p>
                    <p className="text-xs italic text-on-surface-dim">{d.transliteration}</p>
                    <p className="mt-1 text-sm text-on-surface">{d.translation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
