import { useMemo, useState } from "react";
import type { Prayer, PrayerLog, PrayerStatus } from "../../lib/salah";
import {
  PRAYERS,
  PRAYER_LABELS,
  buildLogMap,
  isPerfectDay,
  prayedCount,
  toDayString
} from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
  onSetStatus: (day: string, prayer: Prayer, status: PrayerStatus) => void;
}

const STATUSES: { id: PrayerStatus; label: string }[] = [
  { id: "on_time", label: "On" },
  { id: "late", label: "Late" },
  { id: "missed", label: "Miss" }
];

function statusBtnClasses(status: PrayerStatus, active: boolean): string {
  if (!active) return "text-on-surface-dim/50 hover:text-on-surface";
  switch (status) {
    case "on_time":
      return "bg-primary text-on-primary";
    case "late":
      return "bg-tertiary-container text-on-tertiary-container";
    case "missed":
      return "bg-white/15 text-on-surface";
  }
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

export function SalahHistory({ logs, onSetStatus }: Props) {
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
            const perfect = !isFuture && isPerfectDay(logs, dayStr);
            return (
              <button
                key={dayStr}
                className={`relative flex aspect-square items-center justify-center rounded-lg border text-[11px] font-bold transition-all duration-200 active:scale-90 ${
                  isFuture ? "border-transparent text-on-surface-dim/20" : INTENSITY[count]
                } ${selected ? "ring-2 ring-primary" : ""} ${
                  perfect ? "ring-2 ring-tertiary ring-offset-1 ring-offset-surface" : ""
                }`}
                onClick={() => !isFuture && setSelectedDay(selected ? null : dayStr)}
                disabled={isFuture}
                aria-label={`${dayStr}: ${count} of 5 prayed${perfect ? ", perfect day" : ""}`}
              >
                {day}
                {perfect && (
                  <span className="material-symbols-outlined is-filled absolute -top-1.5 -right-1.5 text-[13px] text-tertiary">
                    star
                  </span>
                )}
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
              const status = selectedEntry?.[p];
              return (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                    <span className="text-sm font-bold text-on-surface">{PRAYER_LABELS[p]}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/20 p-0.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase transition-colors duration-200 ${statusBtnClasses(
                          s.id,
                          status === s.id
                        )}`}
                        onClick={() => selectedDay && onSetStatus(selectedDay, p, s.id)}
                        aria-pressed={status === s.id}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-on-surface-dim">
            Tap a status to log or update this day.
          </p>
        </div>
      )}
    </section>
  );
}
