import { useState } from "react";
import { DUAS, weeklyDua } from "../../lib/content/duas";
import { toDayString } from "../../lib/salah";

export function SalahDuaLibrary() {
  const todayStr = toDayString(new Date());
  const featured = weeklyDua(todayStr);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-primary uppercase">
        Dua of the week
      </p>
      <h3 className="mb-2 text-base font-bold text-on-surface">{featured.title}</h3>
      <p dir="rtl" className="mb-2 text-right text-xl leading-loose text-on-surface">
        {featured.arabic}
      </p>
      <p className="text-sm italic text-on-surface-dim">{featured.transliteration}</p>
      <p className="mt-1 text-sm text-on-surface">{featured.translation}</p>
      <p className="mt-1 text-[10px] font-bold tracking-widest text-on-surface-dim/60 uppercase">
        {featured.source}
      </p>

      <p className="mt-6 mb-2 text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
        Library
      </p>
      <div className="space-y-2">
        {DUAS.map((d) => {
          const open = expandedId === d.id;
          return (
            <div key={d.id} className="rounded-xl border border-white/5 bg-white/5 p-3">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setExpandedId(open ? null : d.id)}
              >
                <span className="text-sm font-semibold text-on-surface">{d.title}</span>
                <span className="material-symbols-outlined text-on-surface-dim/60">
                  {open ? "expand_less" : "expand_more"}
                </span>
              </button>
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
    </div>
  );
}
