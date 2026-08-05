import { useState } from "react";
import { DUAS } from "../../lib/content/duas";

export function SalahDuaLibrary() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-4 text-[11px] font-extrabold tracking-widest text-primary uppercase">
        Dua library
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
