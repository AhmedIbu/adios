import { useState } from "react";
import { allQuotes } from "../../lib/reminders";

export function SalahQuoteCarousel() {
  const quotes = allQuotes();
  const [index, setIndex] = useState(0);
  const q = quotes[index];

  function shift(delta: number) {
    setIndex((i) => (i + delta + quotes.length) % quotes.length);
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-widest text-tertiary uppercase">Quotes</p>
        <p className="text-xs text-on-surface-dim">
          {index + 1}/{quotes.length}
        </p>
      </div>
      <p className="min-h-[4.5rem] text-base leading-relaxed font-light text-on-surface">{q.text}</p>
      <p className="mt-2 text-xs font-bold tracking-widest text-on-surface-dim/70 uppercase">
        {q.source}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-tertiary active:scale-90"
          onClick={() => shift(-1)}
          aria-label="Previous quote"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-tertiary active:scale-90"
          onClick={() => shift(1)}
          aria-label="Next quote"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
