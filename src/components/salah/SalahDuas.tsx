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
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-primary uppercase">
        Duas
      </p>
      <h3 className="mb-3 text-base font-bold text-on-surface">
        What are you asking Allah for?
      </h3>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-white/10 bg-surface-high px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-dim/50"
          placeholder="Type a dua…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50"
          onClick={handleAdd}
          disabled={adding || !text.trim()}
          aria-label="Add dua"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {pending.length > 0 && (
        <div className="mt-4 space-y-2">
          {pending.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <p className="text-sm text-on-surface">{d.text}</p>
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-on-surface-dim transition-colors hover:text-primary active:scale-90"
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
            className="flex w-full items-center justify-between text-xs font-bold tracking-widest text-on-surface-dim uppercase"
            onClick={() => setShowAnswered((v) => !v)}
          >
            <span>Answered ({answered.length})</span>
            <span className="material-symbols-outlined text-base">
              {showAnswered ? "expand_less" : "expand_more"}
            </span>
          </button>
          {showAnswered && (
            <div className="mt-2 space-y-2">
              {answered.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-xl border border-secondary-container/30 bg-secondary-container/10 p-3"
                >
                  <span className="material-symbols-outlined is-filled text-lg text-secondary">
                    auto_awesome
                  </span>
                  <p className="text-sm text-on-surface">{d.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
