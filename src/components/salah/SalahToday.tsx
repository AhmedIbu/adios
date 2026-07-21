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
  const todayStr = toDayString(new Date());
  const map = useMemo(() => buildLogMap(logs), [logs]);
  const dayEntry = map.get(todayStr);
  const prayed = prayedCount(dayEntry);
  const streak = useMemo(() => currentStreak(map, new Date()), [map]);
  const [leaving, setLeaving] = useState<Set<Prayer>>(new Set());

  const pct = (prayed / PRAYERS.length) * 100;
  const circumference = 2 * Math.PI * 40;

  function handleSetStatus(p: Prayer, status: PrayerStatus) {
    onSetStatus(todayStr, p, status);
    setLeaving((prev) => new Set(prev).add(p));
    window.setTimeout(() => {
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(p);
        return next;
      });
    }, 320);
  }

  const isLoggedToday = (p: Prayer) => !!dayEntry?.[p];
  const visiblePrayers = PRAYERS.filter((p) => !isLoggedToday(p) || leaving.has(p));

  return (
    <section>
      {/* Streak */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">Today</h2>
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
              : "Log each prayer as your day goes."}
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
      <div>
        {visiblePrayers.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-surface-glass p-6 text-center backdrop-blur-md">
            <p className="text-sm font-semibold text-on-surface-dim">
              All prayers logged for today. Alhamdulillah!
            </p>
          </div>
        )}
        {visiblePrayers.map((p) => {
          const meta = PRAYER_META[p];
          const status = dayEntry?.[p];
          const prayedThis = status === "on_time" || status === "late";
          const isLeaving = leaving.has(p);
          return (
            <div
              key={p}
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isLeaving
                  ? "mb-0 max-h-0 scale-95 opacity-0"
                  : "mb-3 max-h-[320px] scale-100 opacity-100"
              }`}
            >
              <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-surface-glass p-4 backdrop-blur-md">
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
                      onClick={() => handleSetStatus(p, s.id)}
                      aria-pressed={status === s.id}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
