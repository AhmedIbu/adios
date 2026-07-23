import { useState } from "react";
import { allHadiths, dailyHadith } from "../../lib/reminders";
import { toDayString } from "../../lib/salah";

export function SalahHadith() {
  const todayStr = toDayString(new Date());
  const today = dailyHadith(todayStr);
  const [browsing, setBrowsing] = useState(false);
  const hadiths = allHadiths();

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-3 text-[11px] font-extrabold tracking-widest text-secondary uppercase">
        Hadith of the day
      </p>
      <p className="text-base leading-relaxed font-light text-on-surface">{today.text}</p>
      <p className="mt-2 text-xs font-bold tracking-widest text-on-surface-dim/70 uppercase">
        {today.source}
      </p>
      <button
        className="mt-4 flex items-center gap-1 text-xs font-bold text-secondary"
        onClick={() => setBrowsing((v) => !v)}
      >
        {browsing ? "Hide all" : "Browse all"}
        <span className="material-symbols-outlined text-base">
          {browsing ? "expand_less" : "expand_more"}
        </span>
      </button>
      {browsing && (
        <div className="mt-3 space-y-2">
          {hadiths.map((h) => (
            <div key={h.text} className="rounded-xl border border-white/5 bg-white/5 p-3">
              <p className="text-sm text-on-surface">{h.text}</p>
              <p className="mt-1 text-[10px] font-bold tracking-widest text-on-surface-dim/60 uppercase">
                {h.source}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
