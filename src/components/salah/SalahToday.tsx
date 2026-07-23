import { useMemo, useState } from "react";
import type { CorePrayer, Prayer, PrayerLog, PrayerStatus } from "../../lib/salah";
import {
  PRAYERS,
  PRAYER_LABELS,
  buildLogMap,
  currentStreak,
  prayedCount,
  toDayString,
  weekComparison
} from "../../lib/salah";
import { PRAYER_META } from "./meta";
import { SalahBreathing } from "./SalahBreathing";

interface Props {
  logs: PrayerLog[];
  onSetStatus: (day: string, prayer: Prayer, status: PrayerStatus, khushu?: number) => void;
  onClearStatus: (day: string, prayer: Prayer) => void;
  onSetSunnah: (day: string, prayer: Prayer, sunnah: boolean) => void;
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

export function SalahToday({ logs, onSetStatus, onClearStatus, onSetSunnah }: Props) {
  const todayStr = toDayString(new Date());
  const map = useMemo(() => buildLogMap(logs), [logs]);
  const dayEntry = map.get(todayStr);
  const prayed = prayedCount(dayEntry);
  const streak = useMemo(() => currentStreak(map, new Date()), [map]);
  const weekCmp = useMemo(() => weekComparison(map, new Date()), [map]);
  const [leaving, setLeaving] = useState<Set<Prayer>>(new Set());
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [sheet, setSheet] = useState<{ prayer: CorePrayer; status: "on_time" | "late" } | null>(
    null
  );
  const [khushu, setKhushuVal] = useState(7);
  const [sunnah, setSunnahVal] = useState(false);

  const pct = (prayed / PRAYERS.length) * 100;
  const circumference = 2 * Math.PI * 40;

  function easeOut(p: Prayer) {
    setLeaving((prev) => new Set(prev).add(p));
    window.setTimeout(() => {
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(p);
        return next;
      });
    }, 320);
  }

  function handleSetStatus(p: CorePrayer, status: PrayerStatus) {
    if (status === "missed") {
      onSetStatus(todayStr, p, status);
      easeOut(p);
      return;
    }
    // Prayed (on time/late) — pause on a quick sheet to rate khushu / note sunnah.
    setKhushuVal(7);
    setSunnahVal(false);
    setSheet({ prayer: p, status });
  }

  function confirmSheet(rate: boolean) {
    if (!sheet) return;
    onSetStatus(todayStr, sheet.prayer, sheet.status, rate ? khushu : undefined);
    if (rate && sunnah) onSetSunnah(todayStr, sheet.prayer, true);
    easeOut(sheet.prayer);
    setSheet(null);
  }

  function toggleTahajjud() {
    const done = dayEntry?.tahajjud === "on_time";
    if (done) onClearStatus(todayStr, "tahajjud");
    else onSetStatus(todayStr, "tahajjud", "on_time");
  }

  const isLoggedToday = (p: Prayer) => !!dayEntry?.[p];
  const visiblePrayers = PRAYERS.filter((p) => !isLoggedToday(p) || leaving.has(p));
  const tahajjudDone = dayEntry?.tahajjud === "on_time";

  return (
    <section>
      {/* Streak */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">Today</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {weekCmp?.isNewBest && (
            <div className="flex items-center gap-1.5 rounded-full border border-tertiary-container/40 bg-tertiary-container/30 px-3.5 py-1.5">
              <span className="material-symbols-outlined is-filled text-sm text-tertiary">
                emoji_events
              </span>
              <span className="text-[11px] font-extrabold tracking-widest text-tertiary uppercase">
                New best week
              </span>
            </div>
          )}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-secondary-container/40 bg-secondary-container/30 px-3.5 py-1.5">
              <span aria-hidden="true">🔥</span>
              <span className="text-[11px] font-extrabold tracking-widest text-secondary uppercase">
                {streak} day streak
              </span>
            </div>
          )}
        </div>
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

      {/* Tahajjud — optional bonus slot, never affects the 5-prayer streak. */}
      <button
        className={`mt-3 flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors duration-200 ${
          tahajjudDone
            ? "border-secondary/30 bg-secondary/10"
            : "border-white/8 bg-surface-glass hover:bg-white/5"
        }`}
        onClick={toggleTahajjud}
      >
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 ${PRAYER_META.tahajjud.iconBg} ${PRAYER_META.tahajjud.color}`}
        >
          <span className="material-symbols-outlined is-filled">
            {PRAYER_META.tahajjud.icon}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-on-surface">Tahajjud</h4>
          <p className="text-xs text-on-surface-dim">Optional night prayer</p>
        </div>
        <span
          className={`material-symbols-outlined ${tahajjudDone ? "is-filled text-secondary" : "text-on-surface-dim/20"}`}
        >
          {tahajjudDone ? "check_circle" : "radio_button_unchecked"}
        </span>
      </button>

      {/* Breathing exercise — a moment to settle before prayer. */}
      <button
        className="mt-3 flex w-full items-center gap-3.5 rounded-2xl border border-white/8 bg-surface-glass p-4 text-left transition-colors duration-200 hover:bg-white/5"
        onClick={() => setBreathingOpen(true)}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-primary/10 text-primary">
          <span className="material-symbols-outlined is-filled">self_improvement</span>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-on-surface">Breathing exercise</h4>
          <p className="text-xs text-on-surface-dim">A moment to settle before you pray</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-dim/40">chevron_right</span>
      </button>

      {breathingOpen && <SalahBreathing onClose={() => setBreathingOpen(false)} />}

      {/* Khushu / sunnah quick sheet, shown after marking a prayer on time/late. */}
      {sheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => confirmSheet(false)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <h3 className="px-5 pt-2 pb-1 text-center text-base font-semibold text-on-surface">
              How was your {PRAYER_LABELS[sheet.prayer]}?
            </h3>
            <p className="px-5 pb-4 text-center text-xs text-on-surface-dim">
              Optional — rate your focus and note the sunnah.
            </p>
            <div className="px-6">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
                  Focus
                </span>
                <span className="text-sm font-bold text-primary">{khushu}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={khushu}
                onChange={(e) => setKhushuVal(Number(e.target.value))}
                className="w-full accent-primary"
              />

              <button
                className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                onClick={() => setSunnahVal((v) => !v)}
              >
                <span className="text-sm font-semibold text-on-surface">
                  I also prayed the sunnah
                </span>
                <span
                  className={`flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition-colors ${
                    sunnah ? "bg-primary" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      sunnah ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>

              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 rounded-full border border-white/10 py-3 text-sm font-bold text-on-surface-dim"
                  onClick={() => confirmSheet(false)}
                >
                  Skip
                </button>
                <button
                  className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-on-primary"
                  onClick={() => confirmSheet(true)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
