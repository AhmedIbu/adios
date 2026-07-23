import { useMemo, useState } from "react";
import { HIJRI_MONTH_NAMES, hijriMonthBounds, shiftHijriMonth, toHijri } from "../../lib/hijri";
import { toDayString } from "../../lib/salah";

export function SalahHijriCalendar() {
  const [anchor, setAnchor] = useState(() => new Date());
  const { start, end, hijri } = useMemo(() => hijriMonthBounds(anchor), [anchor]);
  const todayStr = toDayString(new Date());

  const days = useMemo(() => {
    const list: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      list.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [start, end]);
  const offset = (start.getDay() + 6) % 7; // Monday-first

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-primary active:scale-90"
          onClick={() => setAnchor(shiftHijriMonth(anchor, -1))}
          aria-label="Previous Hijri month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold text-on-surface">
            {HIJRI_MONTH_NAMES[hijri.month - 1]} {hijri.year}
          </h3>
          <p className="text-[10px] font-bold tracking-widest text-primary/60 uppercase">
            Hijri calendar
          </p>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-primary active:scale-90"
          onClick={() => setAnchor(shiftHijriMonth(anchor, 1))}
          aria-label="Next Hijri month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const isToday = toDayString(d) === todayStr;
          return (
            <div
              key={d.toISOString()}
              className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] font-bold ${
                isToday
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-white/5 bg-white/5 text-on-surface-dim"
              }`}
            >
              {toHijri(d).day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
