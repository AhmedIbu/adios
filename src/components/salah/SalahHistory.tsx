import { useMemo, useState } from "react";
import type { PrayerLog, PrayerStatus } from "../../lib/salah";
import { PRAYERS, PRAYER_LABELS, buildLogMap, prayedCount, toDayString } from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Index = number of prayed prayers that day (0–5).
const INTENSITY = [
  "bg-white/5 border-white/5 text-on-surface-dim/60",
  "bg-primary/15 border-primary/10 text-on-surface-dim",
  "bg-primary/30 border-primary/20 text-on-surface",
  "bg-primary/50 border-primary/30 text-on-surface",
  "bg-primary/75 border-primary/40 text-on-primary",
  "bg-primary border-primary text-on-primary shadow-[0_0_10px_rgba(154,204,243,0.4)]"
];

function statusLabel(s: PrayerStatus | undefined): { label: string; cls: string } {
  switch (s) {
    case "on_time":
      return { label: "On time", cls: "text-primary" };
    case "late":
      return { label: "Late", cls: "text-tertiary" };
    case "missed":
      return { label: "Missed", cls: "text-on-surface-dim" };
    default:
      return { label: "Not logged", cls: "text-on-surface-dim/50" };
  }
}

function hijriLabel(d: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      month: "long",
      year: "numeric"
    }).format(d);
  } catch {
    return null;
  }
}

export function SalahHistory({ logs }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const map = useMemo(() => buildLogMap(logs), [logs]);
  const todayStr = toDayString(new Date());

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7; // Monday-first
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const hijri = hijriLabel(new Date(month.getFullYear(), month.getMonth(), 15));

  const selectedEntry = selectedDay ? map.get(selectedDay) : undefined;

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <section className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-surface-glass p-4 backdrop-blur-md">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-primary active:scale-90"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-on-surface">{monthLabel}</h2>
          {hijri && (
            <p className="mt-0.5 text-[10px] font-bold tracking-widest text-primary/60 uppercase">
              {hijri}
            </p>
          )}
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors hover:text-primary active:scale-90"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Heatmap */}
      <div className="rounded-3xl border border-white/8 bg-surface-glass p-5 backdrop-blur-2xl">
        <div className="mb-3 grid grid-cols-7 gap-2 text-center">
          {WEEKDAYS.map((w) => (
            <span
              key={w}
              className="text-[9px] font-bold tracking-widest text-on-surface-dim uppercase"
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayStr = toDayString(new Date(month.getFullYear(), month.getMonth(), day));
            const isFuture = dayStr > todayStr;
            const count = prayedCount(map.get(dayStr));
            const selected = selectedDay === dayStr;
            return (
              <button
                key={dayStr}
                className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] font-bold transition-all duration-200 active:scale-90 ${
                  isFuture ? "border-transparent text-on-surface-dim/20" : INTENSITY[count]
                } ${selected ? "ring-2 ring-primary" : ""}`}
                onClick={() => !isFuture && setSelectedDay(selected ? null : dayStr)}
                disabled={isFuture}
                aria-label={`${dayStr}: ${count} of 5 prayed`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {/* Legend */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <span className="text-[10px] font-bold tracking-widest text-on-surface-dim uppercase">
            Less
          </span>
          <div className="flex gap-1">
            {INTENSITY.map((cls, i) => (
              <div key={i} className={`h-3 w-3 rounded-sm border ${cls}`} />
            ))}
          </div>
          <span className="text-[10px] font-bold tracking-widest text-on-surface-dim uppercase">
            More
          </span>
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="animate-app-in rounded-3xl border border-primary/20 bg-surface-glass p-5 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </h3>
              <p className="text-[11px] font-extrabold tracking-widest text-primary uppercase">
                {prayedCount(selectedEntry)}/5 prayers completed
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {PRAYERS.map((p) => {
              const meta = PRAYER_META[p];
              const st = statusLabel(selectedEntry?.[p]);
              return (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                    <span className="text-sm font-bold text-on-surface">{PRAYER_LABELS[p]}</span>
                  </div>
                  <span className={`text-xs font-bold tracking-wide uppercase ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-on-surface-dim">
            To edit this day, use the arrows on the Today tab.
          </p>
        </div>
      )}
    </section>
  );
}
