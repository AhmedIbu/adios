import { useState } from "react";
import type { AnsweredDua } from "../../lib/journal";

interface Props {
  duas: AnsweredDua[];
  onAdd: (text: string) => Promise<void>;
  onMarkAnswered: (id: string) => Promise<void>;
}

export function SalahDuas({ duas, onAdd, onMarkAnswered }: Props) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAnswered, setShowAnswered] = useState(false);

  const pending = duas.filter((d) => !d.answered_at);
  const answered = duas.filter((d) => d.answered_at);

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await onAdd(text.trim());
      setText("");
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-primary)" }}>
        Duas
      </p>
      <h3 className="mb-3 text-base font-semibold" style={{ color: "var(--s-on-surface)" }}>
        What are you asking Allah for?
      </h3>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          style={{ background: "var(--s-surface-container-lowest)", color: "var(--s-on-surface)" }}
          placeholder="Type a dua…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full disabled:opacity-50"
          style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
          onClick={handleAdd}
          disabled={adding || !text.trim()}
          aria-label="Add dua"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {pending.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {pending.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl p-3"
              style={{ background: "var(--s-surface-container-lowest)" }}
            >
              <p className="text-sm" style={{ color: "var(--s-on-surface)" }}>
                {d.text}
              </p>
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors active:scale-90"
                style={{ color: "var(--s-on-surface-variant)" }}
                onClick={() => onMarkAnswered(d.id)}
                aria-label="Mark as answered"
                title="Mark as answered"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <div className="mt-4">
          <button
            className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--s-on-surface-variant)" }}
            onClick={() => setShowAnswered((v) => !v)}
          >
            <span>Answered ({answered.length})</span>
            <span className="material-symbols-outlined text-base">
              {showAnswered ? "expand_less" : "expand_more"}
            </span>
          </button>
          {showAnswered && (
            <div className="mt-2 flex flex-col gap-2">
              {answered.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-xl p-3"
                  style={{ background: "color-mix(in srgb, var(--s-secondary-container) 40%, transparent)" }}
                >
                  <span className="material-symbols-outlined is-filled text-lg" style={{ color: "var(--s-secondary)" }}>
                    auto_awesome
                  </span>
                  <p className="text-sm" style={{ color: "var(--s-on-surface)" }}>
                    {d.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
