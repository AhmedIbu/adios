import { useMemo, useState } from "react";
import type { CorePrayer, Prayer, PrayerLog, PrayerStatus, SalahSettingsRow } from "../../lib/salah";
import {
  PRAYERS,
  PRAYER_LABELS,
  buildLogMap,
  currentStreak,
  prayedCount,
  toDayString,
  weekComparison
} from "../../lib/salah";
import { computeDayTimes, deltaMinutes, formatDelta, hasLocation } from "../../lib/prayertimes";
import type { Intention } from "../../lib/journal";
import { PRAYER_META } from "./meta";
import { SalahBreathing } from "./SalahBreathing";
import { SalahIntentionRecorder } from "./SalahIntentionRecorder";

interface Props {
  logs: PrayerLog[];
  onSetStatus: (day: string, prayer: Prayer, status: PrayerStatus) => void;
  onClearStatus: (day: string, prayer: Prayer) => void;
  onSetSunnah: (day: string, prayer: Prayer, sunnah: boolean) => void;
  settings: SalahSettingsRow | null;
  intentions: Intention[];
  onSaveIntentionText: (day: string, prayer: Prayer, text: string) => void;
  onSaveIntentionAudio: (day: string, prayer: Prayer, blob: Blob) => void;
  onGetIntentionAudioUrl: (path: string) => Promise<string>;
}

function IntentionRow({
  intention,
  onGetAudioUrl
}: {
  intention: Intention;
  onGetAudioUrl: (path: string) => Promise<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const meta = PRAYER_META[intention.prayer];

  async function handleToggle() {
    if (intention.audio_path && !audioUrl) {
      try {
        setAudioUrl(await onGetAudioUrl(intention.audio_path));
      } catch (e) {
        console.error(e);
      }
    }
    setExpanded((v) => !v);
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--s-surface-container-lowest)", border: "1px solid var(--s-outline-variant)" }}
    >
      <button className="flex w-full items-center justify-between" onClick={handleToggle}>
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg" style={{ color: "var(--s-primary)" }}>
            {meta.icon}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
            {PRAYER_LABELS[intention.prayer]}
          </span>
        </div>
        <span className="material-symbols-outlined" style={{ color: "var(--s-on-surface-variant)" }}>
          {expanded ? "expand_less" : "expand_more"}
        </span>
      </button>
      {expanded && intention.text && (
        <p className="mt-2 text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
          {intention.text}
        </p>
      )}
      {expanded && audioUrl && <audio className="mt-2 w-full" controls src={audioUrl} />}
    </div>
  );
}

const STATUSES: { id: PrayerStatus; label: string; icon: string }[] = [
  { id: "on_time", label: "On Time", icon: "check_circle" },
  { id: "qada", label: "Qada", icon: "history" },
  { id: "missed", label: "Missed", icon: "close" }
];

export function SalahToday({
  logs,
  onSetStatus,
  onClearStatus,
  onSetSunnah,
  settings,
  intentions,
  onSaveIntentionText,
  onSaveIntentionAudio,
  onGetIntentionAudioUrl
}: Props) {
  const todayStr = toDayString(new Date());
  const map = useMemo(() => buildLogMap(logs), [logs]);
  const dayEntry = map.get(todayStr);
  const prayed = prayedCount(dayEntry);
  const streak = useMemo(() => currentStreak(map, new Date()), [map]);
  const weekCmp = useMemo(() => weekComparison(map, new Date()), [map]);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [sheet, setSheet] = useState<{ prayer: CorePrayer; status: "on_time" | "qada" } | null>(
    null
  );
  const [sunnah, setSunnahVal] = useState(false);
  const [intentionValue, setIntentionValue] = useState<{ text: string; audioBlob: Blob | null }>({
    text: "",
    audioBlob: null
  });

  const todaysIntentions = useMemo(
    () => intentions.filter((i) => i.day === todayStr),
    [intentions, todayStr]
  );

  const todayTimes = useMemo(
    () => (hasLocation(settings) ? computeDayTimes(settings, new Date()) : null),
    [settings]
  );
  const sheetDelta =
    sheet && todayTimes ? deltaMinutes(todayTimes[sheet.prayer], new Date()) : null;

  const pct = (prayed / PRAYERS.length) * 100;
  const circumference = 2 * Math.PI * 40;

  function handleSetStatus(p: CorePrayer, status: PrayerStatus) {
    if (status === "missed") {
      onSetStatus(todayStr, p, status);
      return;
    }
    // Prayed (on time/qada) — pause on a quick sheet to note sunnah / an intention.
    setSunnahVal(false);
    setIntentionValue({ text: "", audioBlob: null });
    setSheet({ prayer: p, status });
  }

  function confirmSheet(applyExtras: boolean) {
    if (!sheet) return;
    onSetStatus(todayStr, sheet.prayer, sheet.status);
    if (applyExtras && sunnah) onSetSunnah(todayStr, sheet.prayer, true);
    if (applyExtras && intentionValue.text.trim()) {
      onSaveIntentionText(todayStr, sheet.prayer, intentionValue.text.trim());
    } else if (applyExtras && intentionValue.audioBlob) {
      onSaveIntentionAudio(todayStr, sheet.prayer, intentionValue.audioBlob);
    }
    setSheet(null);
  }

  function toggleTahajjud() {
    const done = dayEntry?.tahajjud === "on_time";
    if (done) onClearStatus(todayStr, "tahajjud");
    else onSetStatus(todayStr, "tahajjud", "on_time");
  }

  const tahajjudDone = dayEntry?.tahajjud === "on_time";
  const nextPrayer = PRAYERS.find((p) => !dayEntry?.[p]) ?? null;
  const nextMeta = nextPrayer ? PRAYER_META[nextPrayer] : null;
  const nextTime =
    nextPrayer && todayTimes
      ? todayTimes[nextPrayer].toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : null;

  return (
    <section className="flex flex-col gap-6 pb-6">
      {/* Badges row */}
      {(weekCmp?.isNewBest || streak > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {weekCmp?.isNewBest && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
              style={{ background: "var(--s-tertiary-container)", opacity: 0.9 }}
            >
              <span className="material-symbols-outlined text-sm" style={{ color: "var(--s-on-tertiary-container)" }}>
                emoji_events
              </span>
              <span
                className="text-[11px] font-bold tracking-widest uppercase"
                style={{ color: "var(--s-on-tertiary-container)" }}
              >
                New best week
              </span>
            </div>
          )}
          {streak > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
              style={{ background: "var(--s-secondary-container)" }}
            >
              <span aria-hidden="true">🔥</span>
              <span
                className="text-[11px] font-bold tracking-widest uppercase"
                style={{ color: "var(--s-on-secondary-container)" }}
              >
                {streak} day streak
              </span>
            </div>
          )}
        </div>
      )}

      {/* Daily Progress card */}
      <div
        className="relative flex items-center justify-between overflow-hidden rounded-3xl p-5"
        style={{ background: "var(--s-surface-container)" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--s-primary-fixed) 20%, transparent)" }}
        />
        <div className="z-10">
          <h2 className="font-headline text-2xl" style={{ color: "var(--s-on-surface)" }}>
            Daily Progress
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            {prayed} of {PRAYERS.length} obligatory prayers completed
          </p>
        </div>
        <div className="relative z-10 h-20 w-20 flex-none">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--s-surface-variant)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--s-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      </div>

      {/* Active / next prayer highlight */}
      {nextPrayer && nextMeta && (
        <div
          className="relative overflow-hidden rounded-3xl p-5 shadow-[0_4px_24px_rgba(22,52,34,0.08)]"
          style={{ background: "var(--s-surface-container-low)" }}
        >
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl"
            style={{ background: "color-mix(in srgb, var(--s-primary-fixed) 40%, transparent)" }}
          />
          <div className="relative z-10 mb-4 flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--s-primary)" }} />
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--s-primary)" }}
                >
                  Next Prayer
                </span>
              </div>
              <h3 className="font-headline text-4xl" style={{ color: "var(--s-on-surface)" }}>
                {PRAYER_LABELS[nextPrayer]}
              </h3>
            </div>
            {nextTime && (
              <div className="text-right">
                <p className="text-xl font-headline" style={{ color: "var(--s-on-surface)" }}>
                  {nextTime}
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 flex gap-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-transform active:scale-95"
              style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
              onClick={() => handleSetStatus(nextPrayer, "on_time")}
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span> On Time
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-transform active:scale-95"
              style={{ background: "var(--s-surface-container-high)", color: "var(--s-on-surface)" }}
              onClick={() => handleSetStatus(nextPrayer, "qada")}
            >
              <span className="material-symbols-outlined text-[20px]">history</span> Qada
            </button>
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-transform active:scale-95"
              style={{
                background: "color-mix(in srgb, var(--s-error-container) 30%, transparent)",
                color: "var(--s-error)",
                border: "1px solid color-mix(in srgb, var(--s-error) 20%, transparent)"
              }}
              onClick={() => handleSetStatus(nextPrayer, "missed")}
            >
              <span className="material-symbols-outlined text-[20px]">close</span> Missed
            </button>
          </div>
        </div>
      )}

      {/* Today's Log */}
      <div className="flex flex-col gap-3">
        <h3 className="px-1 font-headline text-2xl" style={{ color: "var(--s-on-surface)" }}>
          Today's Log
        </h3>
        {PRAYERS.map((p) => {
          const meta = PRAYER_META[p];
          const status = dayEntry?.[p];
          const isLogged = status === "on_time" || status === "qada";
          const isMissed = status === "missed";
          return (
            <div
              key={p}
              className="flex flex-col gap-3 rounded-2xl p-4 shadow-sm"
              style={{ background: "var(--s-surface-container-lowest)", border: "1px solid var(--s-surface-container)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: isLogged ? "var(--s-primary-container)" : "var(--s-surface-variant)"
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: isLogged ? "var(--s-on-primary-container)" : "var(--s-on-surface-variant)" }}
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold" style={{ color: "var(--s-on-surface)" }}>
                      {PRAYER_LABELS[p]}
                    </h4>
                    {todayTimes && (
                      <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                        {todayTimes[p].toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
                {isLogged && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{
                      background: status === "qada" ? "var(--s-tertiary-container)" : "var(--s-primary-fixed)",
                      color: status === "qada" ? "var(--s-on-tertiary-container)" : "var(--s-on-primary-fixed)"
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {status === "qada" ? "Qada" : "Logged"}
                  </div>
                )}
                {isMissed && (
                  <div
                    className="rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{ background: "var(--s-error-container)", color: "var(--s-on-error-container)" }}
                  >
                    Missed
                  </div>
                )}
                {!status && p !== nextPrayer && (
                  <span className="text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
                    Upcoming
                  </span>
                )}
              </div>

              {/* Quick status switcher — always available so a logged prayer can be corrected. */}
              <div
                className="grid grid-cols-3 gap-1 rounded-full p-1"
                style={{ background: "var(--s-surface-container-high)" }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    className="rounded-full py-1.5 text-center text-[10px] font-bold uppercase tracking-wide transition-colors"
                    style={
                      status === s.id
                        ? s.id === "missed"
                          ? { background: "var(--s-error-container)", color: "var(--s-on-error-container)" }
                          : s.id === "qada"
                            ? { background: "var(--s-tertiary-container)", color: "var(--s-on-tertiary-container)" }
                            : { background: "var(--s-primary)", color: "var(--s-on-primary)" }
                        : { color: "var(--s-on-surface-variant)" }
                    }
                    onClick={() => handleSetStatus(p, s.id)}
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

      {/* Tahajjud — optional bonus slot, never affects the 5-prayer streak. */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 shadow-sm"
        style={{
          background: "linear-gradient(to bottom right, var(--s-surface-container), var(--s-surface-container-high))",
          border: "1px solid var(--s-outline-variant)"
        }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-32 w-32"
          style={{
            background:
              "radial-gradient(ellipse at top right, color-mix(in srgb, var(--s-tertiary-fixed) 30%, transparent), transparent)"
          }}
        />
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
              Tahajjud
            </h3>
            <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
              Voluntary Night Prayer
            </p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm"
            style={{ background: "var(--s-tertiary-container)" }}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ color: "var(--s-on-tertiary-container)" }}>
              bedtime
            </span>
          </div>
        </div>
        <button
          className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors"
          style={{
            background: tahajjudDone ? "var(--s-primary-fixed)" : "var(--s-surface-container-lowest)",
            color: tahajjudDone ? "var(--s-on-primary-fixed)" : "var(--s-on-surface)",
            border: "1px solid var(--s-outline-variant)"
          }}
          onClick={toggleTahajjud}
        >
          <span className="material-symbols-outlined text-[20px]">{tahajjudDone ? "check_circle" : "add"}</span>
          {tahajjudDone ? "Logged" : "Log Tahajjud"}
        </button>
      </div>

      {/* Breathing exercise — a moment to settle before prayer. */}
      <button
        className="flex w-full items-center gap-3.5 rounded-2xl p-4 text-left shadow-sm transition-colors"
        style={{ background: "var(--s-surface-container-lowest)", border: "1px solid var(--s-surface-container)" }}
        onClick={() => setBreathingOpen(true)}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: "var(--s-primary-container)" }}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--s-on-primary-container)" }}>
            self_improvement
          </span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
            Breathing exercise
          </h4>
          <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
            A moment to settle before you pray
          </p>
        </div>
        <span className="material-symbols-outlined" style={{ color: "var(--s-on-surface-variant)" }}>
          chevron_right
        </span>
      </button>

      {breathingOpen && <SalahBreathing onClose={() => setBreathingOpen(false)} />}

      {/* Today's intentions — tap to replay/read what you noted when logging. */}
      {todaysIntentions.length > 0 && (
        <div className="space-y-2">
          <p
            className="px-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--s-on-surface-variant)" }}
          >
            Today's intentions
          </p>
          {todaysIntentions.map((it) => (
            <IntentionRow key={it.id} intention={it} onGetAudioUrl={onGetIntentionAudioUrl} />
          ))}
        </div>
      )}

      {/* Sunnah / intention quick sheet, shown after marking a prayer on time/qada. */}
      {sheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => confirmSheet(false)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl pb-8 shadow-2xl"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
              background: "var(--s-surface-container-lowest)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: "var(--s-outline-variant)" }} />
            </div>
            <h3
              className="px-5 pt-2 pb-1 text-center text-base font-semibold"
              style={{ color: "var(--s-on-surface)" }}
            >
              How was your {PRAYER_LABELS[sheet.prayer]}?
            </h3>
            <p className="px-5 pb-4 text-center text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
              Optional — note the sunnah or an intention.
            </p>
            {sheetDelta != null && (
              <p className="px-5 pb-4 text-center text-xs font-semibold" style={{ color: "var(--s-primary)" }}>
                {sheet && PRAYER_LABELS[sheet.prayer]} adhan was{" "}
                {todayTimes &&
                  sheet &&
                  todayTimes[sheet.prayer].toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit"
                  })}{" "}
                — you're logging {formatDelta(sheetDelta)}
              </p>
            )}
            <div className="px-6">
              <button
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: "var(--s-surface-container)" }}
                onClick={() => setSunnahVal((v) => !v)}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                  I also prayed the sunnah
                </span>
                <span
                  className="flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition-colors"
                  style={{ background: sunnah ? "var(--s-primary)" : "var(--s-outline-variant)" }}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      sunnah ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>

              <SalahIntentionRecorder
                key={`${sheet.prayer}-${sheet.status}`}
                onChange={setIntentionValue}
              />

              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 rounded-full py-3 text-sm font-bold"
                  style={{ border: "1px solid var(--s-outline-variant)", color: "var(--s-on-surface-variant)" }}
                  onClick={() => confirmSheet(false)}
                >
                  Skip
                </button>
                <button
                  className="flex-1 rounded-full py-3 text-sm font-bold"
                  style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
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
