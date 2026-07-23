import { useState } from "react";
import { DUAS } from "../../lib/content/duas";

function randomIndex(exclude: number, length: number): number {
  if (length <= 1) return 0;
  let i = exclude;
  while (i === exclude) i = Math.floor(Math.random() * length);
  return i;
}

export function SalahDuaQuiz() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * DUAS.length));
  const [revealed, setRevealed] = useState(false);
  const dua = DUAS[index];

  function next() {
    setIndex((i) => randomIndex(i, DUAS.length));
    setRevealed(false);
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-3 text-[11px] font-extrabold tracking-widest text-tertiary uppercase">
        Dua quiz
      </p>
      <p className="mb-4 text-sm text-on-surface-dim">Which dua is this?</p>
      <p className="text-base font-semibold text-on-surface">{dua.translation}</p>

      {revealed ? (
        <div className="mt-4 border-t border-white/8 pt-4">
          <p className="text-sm font-bold text-primary">{dua.title}</p>
          <p dir="rtl" className="mt-2 text-right text-xl leading-loose text-on-surface">
            {dua.arabic}
          </p>
          <p className="mt-1 text-sm italic text-on-surface-dim">{dua.transliteration}</p>
        </div>
      ) : (
        <button
          className="mt-4 w-full rounded-full border border-white/10 py-2.5 text-sm font-bold text-on-surface-dim"
          onClick={() => setRevealed(true)}
        >
          Reveal
        </button>
      )}

      <button
        className="mt-3 w-full rounded-full bg-tertiary py-2.5 text-sm font-bold text-on-tertiary"
        onClick={next}
      >
        Next
      </button>
    </div>
  );
}
