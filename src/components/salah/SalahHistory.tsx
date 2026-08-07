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
  onSetSunnah: (day: string, prayer: Prayer, sunnah: boolean) => void;
}

const STATUSES: { id: PrayerStatus; label: string }[] = [
  { id: "on_time", label: "On" },
  { id: "qada", label: "Qada" },
  { id: "missed", label: "Miss" }
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

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

export function SalahHistory({ logs, onSetStatus, onSetSunnah }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toDayString(new Date()));

  const map = useMemo(() => buildLogMap(logs), [logs]);
  const todayStr = toDayString(new Date());

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay(); // Sunday-first, matches mockup's S M T W T F S header
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const hijri = hijriLabel(new Date(month.getFullYear(), month.getMonth(), 15));

  const selectedEntry = selectedDay ? map.get(selectedDay) : undefined;
  const selectedCount = prayedCount(selectedEntry);
  const selectedPct = (selectedCount / PRAYERS.length) * 100;
  const circumference = 2 * Math.PI * 16;

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  return (
    <section className="flex flex-col gap-6 pb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl" style={{ color: "var(--s-primary)" }}>
            {monthLabel}
          </h2>
          {hijri && (
            <p className="mt-0.5 text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--s-on-surface-variant)" }}>
              {hijri}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface-variant)" }}
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface-variant)" }}
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <div className="mb-4 grid grid-cols-7 gap-y-4 gap-x-2 text-center">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-[12px] font-medium" style={{ color: "var(--s-on-surface-variant)" }}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayStr = toDayString(new Date(month.getFullYear(), month.getMonth(), day));
            const isFuture = dayStr > todayStr;
            const count = prayedCount(map.get(dayStr));
            const selected = selectedDay === dayStr;
            const isToday = dayStr === todayStr;
            const perfect = !isFuture && isPerfectDay(logs, dayStr);

            let bg = "transparent";
            let color = "var(--s-on-surface)";
            if (isFuture) {
              color = "var(--s-outline-variant)";
            } else if (count === 0) {
              bg = "var(--s-surface-container)";
            } else if (count >= PRAYERS.length) {
              bg = "var(--s-primary-fixed)";
              color = "var(--s-on-primary-fixed)";
            } else {
              bg = "var(--s-tertiary-fixed)";
              color = "var(--s-on-tertiary-fixed-variant)";
            }
            if (selected) {
              bg = "var(--s-primary)";
              color = "var(--s-on-primary)";
            }

            return (
              <button
                key={dayStr}
                className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all active:scale-95"
                style={{
                  background: bg,
                  color,
                  boxShadow: selected ? "0 4px 12px rgba(22,52,34,0.3)" : undefined,
                  outline: isToday && !selected ? "2px solid var(--s-primary)" : undefined,
                  outlineOffset: isToday && !selected ? "2px" : undefined
                }}
                onClick={() => !isFuture && setSelectedDay(selected ? null : dayStr)}
                disabled={isFuture}
                aria-label={`${dayStr}: ${count} of 5 prayed${perfect ? ", perfect day" : ""}`}
              >
                {day}
                {perfect && (
                  <span
                    className="material-symbols-outlined is-filled absolute -right-1 -top-1 text-[13px]"
                    style={{ color: "var(--s-tertiary-container)" }}
                  >
                    star
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Log */}
      {selectedDay && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                {selectedDay === todayStr ? "Today's Log" : "Daily Log"}
              </p>
              <h3 className="font-headline text-xl" style={{ color: "var(--s-primary)" }}>
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </h3>
              <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
                {selectedCount} of {PRAYERS.length} prayers completed
              </p>
            </div>
            <div className="relative h-12 w-12 flex-none">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--s-surface-container)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="var(--s-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - selectedPct / 100)}
                  className="transition-all duration-700"
                />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {PRAYERS.map((p) => {
              const meta = PRAYER_META[p];
              const status = selectedEntry?.[p];
              const isLogged = status === "on_time" || status === "qada";
              const isMissed = status === "missed";
              const log = logs.find((l) => l.day === selectedDay && l.prayer === p);

              const stripeColor = isLogged
                ? status === "qada"
                  ? "var(--s-tertiary)"
                  : "var(--s-primary)"
                : isMissed
                  ? "var(--s-error)"
                  : "var(--s-outline-variant)";

              return (
                <div
                  key={p}
                  className="relative flex flex-col gap-3 overflow-hidden rounded-xl p-4 shadow-sm"
                  style={{ background: "var(--s-surface-container)" }}
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
                    style={{ background: stripeColor }}
                  />
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 pl-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        background: isLogged
                          ? status === "qada"
                            ? "var(--s-tertiary-container)"
                            : "var(--s-primary-container)"
                          : isMissed
                            ? "var(--s-error-container)"
                            : "var(--s-surface-container-highest)"
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{
                          color: isLogged
                            ? status === "qada"
                              ? "var(--s-on-tertiary-container)"
                              : "var(--s-on-primary-container)"
                            : isMissed
                              ? "var(--s-on-error-container)"
                              : "var(--s-on-surface-variant)"
                        }}
                      >
                        {isLogged ? "check_circle" : isMissed ? "cancel" : meta.icon}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold" style={{ color: "var(--s-on-surface)" }}>
                          {PRAYER_LABELS[p]}
                        </h4>
                        {status === "qada" && (
                          <span
                            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: "color-mix(in srgb, var(--s-tertiary) 10%, transparent)", color: "var(--s-tertiary)" }}
                          >
                            Qada
                          </span>
                        )}
                      </div>
                      {!status && (
                        <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                          Not logged
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-full p-0.5"
                    style={{ background: "var(--s-surface-container-high)" }}
                  >
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors"
                        style={
                          status === s.id
                            ? s.id === "missed"
                              ? { background: "var(--s-error-container)", color: "var(--s-on-error-container)" }
                              : s.id === "qada"
                                ? { background: "var(--s-tertiary-container)", color: "var(--s-on-tertiary-container)" }
                                : { background: "var(--s-primary)", color: "var(--s-on-primary)" }
                            : { color: "var(--s-on-surface-variant)" }
                        }
                        onClick={() => selectedDay && onSetStatus(selectedDay, p, s.id)}
                        aria-pressed={status === s.id}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  </div>

                  {isLogged && log && (
                    <button
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-left"
                      style={{ background: "var(--s-surface-container-high)" }}
                      onClick={() => selectedDay && onSetSunnah(selectedDay, p, !log.sunnah)}
                    >
                      <span className="text-xs font-semibold" style={{ color: "var(--s-on-surface)" }}>
                        Prayed with sunnah
                      </span>
                      <span
                        className="flex h-5 w-9 flex-none items-center rounded-full p-0.5 transition-colors"
                        style={{ background: log.sunnah ? "var(--s-primary)" : "var(--s-outline-variant)" }}
                      >
                        <span
                          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            log.sunnah ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
