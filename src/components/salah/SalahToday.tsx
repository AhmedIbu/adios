import { useMemo, useState } from "react";
import type { Prayer, PrayerLog, PrayerStatus } from "../../lib/salah";
import {
  PRAYERS,
  PRAYER_LABELS,
  buildLogMap,
  currentStreak,
  prayedCount,
  toDayString
} from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
  onSetStatus: (day: string, prayer: Prayer, status: PrayerStatus) => void;
}

const STATUSES: { id: PrayerStatus; label: string }[] = [
  { id: "on_time", label: "On time" },
  { id: "late", label: "Late" },
  { id: "missed", label: "Missed" }
];

function statusClasses(status: PrayerStatus, active: boolean): string {
  if (!active) return "text-on-surface-dim hover:text-on-surface";
  switch (status) {
    case "on_time":
      return "bg-primary text-on-primary";
    case "late":
      return "bg-tertiary-container text-on-tertiary-container";
    case "missed":
      // Deliberately muted, not alarming red.
      return "bg-white/15 text-on-surface";
  }
}

export function SalahToday({ logs, onSetStatus }: Props) {
  const [selected, setSelected] = useState(() => toDayString(new Date()));
  const todayStr = toDayString(new Date());
  const map = useMemo(() => buildLogMap(logs), [logs]);
  const dayEntry = map.get(selected);
  const prayed = prayedCount(dayEntry);
  const streak = useMemo(() => currentStreak(map, new Date()), [map]);

  const isToday = selected === todayStr;
  const pct = (prayed / PRAYERS.length) * 100;
  const circumference = 2 * Math.PI * 40;

  function shiftDay(delta: number) {
    const d = new Date(selected + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = toDayString(d);
    if (next > todayStr) return;
    setSelected(next);
  }

  const dayLabel = isToday
    ? "Today"
    : new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      });

  return (
    <section>
      {/* Date nav + streak */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-glass text-on-surface-dim transition-colors hover:text-primary active:scale-90"
            onClick={() => shiftDay(-1)}
            aria-label="Previous day"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="min-w-24 text-center text-xl font-bold tracking-tight text-on-surface">
            {dayLabel}
          </h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-glass text-on-surface-dim transition-colors hover:text-primary active:scale-90 disabled:opacity-30"
            onClick={() => shiftDay(1)}
            disabled={isToday}
            aria-label="Next day"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-secondary-container/40 bg-secondary-container/30 px-3.5 py-1.5">
            <span aria-hidden="true">🔥</span>
            <span className="text-[11px] font-extrabold tracking-widest text-secondary uppercase">
              {streak} day streak
            </span>
          </div>
        )}
      </div>

      {/* Progress card */}
      <div className="relative mb-6 flex items-center justify-between overflow-hidden rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="z-10">
          <p className="mb-1 text-[11px] font-extrabold tracking-widest text-primary uppercase">
            Your progress
          </p>
          <h3 className="text-xl font-bold text-on-surface">
            {prayed} of {PRAYERS.length} Prayers
          </h3>
          <p className="mt-1 text-sm text-on-surface-dim">
            {prayed === PRAYERS.length
              ? "All prayers completed. Alhamdulillah!"
              : isToday
                ? "Log each prayer as your day goes."
                : "Fill in what you remember for this day."}
          </p>
        </div>
        <div className="relative z-10 h-24 w-24 flex-none">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96">
            <circle
              className="text-white/5"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
            <circle
              className="text-primary transition-all duration-500"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="48"
              cy="48"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{Math.round(pct)}%</span>
          </div>
        </div>
      </div>

      {/* Prayer cards */}
      <div className="space-y-3">
        {PRAYERS.map((p) => {
          const meta = PRAYER_META[p];
          const status = dayEntry?.[p];
          const prayedThis = status === "on_time" || status === "late";
          return (
            <div
              key={p}
              className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-surface-glass p-4 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 ${meta.iconBg} ${meta.color}`}
                  >
                    <span className="material-symbols-outlined is-filled">{meta.icon}</span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface">{PRAYER_LABELS[p]}</h4>
                </div>
                <span
                  className={`material-symbols-outlined ${
                    prayedThis
                      ? "is-filled text-primary"
                      : status === "missed"
                        ? "text-on-surface-dim/50"
                        : "text-on-surface-dim/20"
                  }`}
                >
                  {prayedThis
                    ? "check_circle"
                    : status === "missed"
                      ? "do_not_disturb_on"
                      : "radio_button_unchecked"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 rounded-full border border-white/5 bg-black/20 p-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    className={`rounded-full py-2 text-center text-[11px] font-extrabold tracking-widest uppercase transition-colors duration-200 ${statusClasses(
                      s.id,
                      status === s.id
                    )}`}
                    onClick={() => onSetStatus(selected, p, s.id)}
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
    </section>
  );
}
