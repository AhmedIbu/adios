import { useMemo, useState } from "react";
import type { PrayerLog, QadaLog } from "../../lib/salah";
import {
  PRAYERS,
  PRAYER_LABELS,
  buildLogMap,
  completionStats,
  currentStreak,
  firstLoggedDay,
  longestStreak,
  missedCounts,
  monthComparison,
  prayedCount,
  qadaOwed,
  sunnahStats,
  toDayString,
  weekComparison
} from "../../lib/salah";

const SEGMENT_COLORS = [
  "var(--s-tertiary)",
  "color-mix(in srgb, var(--s-tertiary) 60%, transparent)",
  "color-mix(in srgb, var(--s-tertiary) 30%, transparent)",
  "var(--s-secondary)",
  "var(--s-primary)"
];

const BAR_COLORS: Record<string, string> = {
  fajr: "var(--s-tertiary)",
  dhuhr: "var(--s-primary)",
  asr: "var(--s-secondary)",
  maghrib: "#c76a8a",
  isha: "var(--s-primary-container)"
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  logs: PrayerLog[];
  qadaLogs: QadaLog[];
}

export function SalahStats({ logs, qadaLogs }: Props) {
  const [range, setRange] = useState<"month" | "all">("month");
  const map = useMemo(() => buildLogMap(logs), [logs]);

  const streak = useMemo(() => currentStreak(map, new Date()), [map]);
  const longest = useMemo(() => longestStreak(map), [map]);

  const completion = useMemo(() => {
    const today = new Date();
    if (range === "month") {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return completionStats(map, from, today);
    }
    const first = firstLoggedDay(map);
    if (!first) return { prayed: 0, total: 0 };
    return completionStats(map, first, today);
  }, [map, range]);

  const pct = completion.total > 0 ? (completion.prayed / completion.total) * 100 : 0;

  // Last 7 days, oldest first — daily completion % for the consistency chart.
  const week = useMemo(() => {
    const days: { label: string; pct: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const count = prayedCount(map.get(toDayString(d)));
      days.push({
        label: DAY_LABELS[d.getDay()],
        pct: (count / PRAYERS.length) * 100,
        isToday: i === 0
      });
    }
    return days;
  }, [map]);
  const weekAvg = week.reduce((s, d) => s + d.pct, 0) / week.length;
  const prevWeekAvg = useMemo(() => {
    let sum = 0;
    const today = new Date();
    for (let i = 13; i >= 7; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      sum += (prayedCount(map.get(toDayString(d))) / PRAYERS.length) * 100;
    }
    return sum / 7;
  }, [map]);
  const weekDeltaPct = Math.round(weekAvg - prevWeekAvg);

  const missed = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return missedCounts(map, from, to);
  }, [map]);
  const maxMissed = Math.max(1, ...PRAYERS.map((p) => missed[p]));

  const owed = useMemo(() => qadaOwed(logs, qadaLogs), [logs, qadaLogs]);
  const totalOwed = PRAYERS.reduce((sum, p) => sum + owed[p], 0);
  const owedSegments = useMemo(() => {
    const withOwed = PRAYERS.filter((p) => owed[p] > 0);
    let acc = 0;
    return withOwed.map((p, i) => {
      const frac = owed[p] / totalOwed;
      const seg = { prayer: p, from: acc, to: acc + frac, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] };
      acc += frac;
      return seg;
    });
  }, [owed, totalOwed]);
  const donutCircumference = 2 * Math.PI * 16;

  const sunnah = useMemo(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return sunnahStats(logs, from, today);
  }, [logs]);

  const weekCmp = useMemo(() => weekComparison(map, new Date()), [map]);
  const monthCmp = useMemo(() => monthComparison(map, new Date()), [map]);

  return (
    <section className="flex flex-col gap-5 pb-6">
      {/* Consistency */}
      <div className="relative overflow-hidden rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom right, color-mix(in srgb, var(--s-primary) 5%, transparent), transparent)" }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <h2 className="font-headline text-2xl" style={{ color: "var(--s-primary)" }}>
            Consistency
          </h2>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: "var(--s-secondary-container)", color: "var(--s-on-secondary-container)" }}
          >
            This week
          </span>
        </div>
        {/* Bars get their own definite-height row (items-stretch, the flex
            default) so each column's flex-1 track has a real height for the
            inner bar's percentage height to resolve against — with
            items-end here instead, columns never stretch and every bar
            silently collapses to 0px regardless of the day's data. */}
        <div className="relative z-10 mt-4 flex h-40 justify-between gap-2 px-1">
          {week.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end">
              <div
                className="relative w-full flex-1 self-stretch rounded-t-sm"
                style={{ background: "color-mix(in srgb, var(--s-primary) 20%, transparent)" }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t-sm transition-all duration-700 ease-out"
                  style={{
                    height: `${Math.max(d.pct, d.pct > 0 ? 6 : 0)}%`,
                    background: "var(--s-primary)",
                    boxShadow: d.isToday ? "0 0 12px rgba(22,52,34,0.3)" : undefined
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10 mt-2 flex justify-between gap-2 px-1">
          {week.map((d, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[11px]"
              style={{
                color: d.isToday ? "var(--s-primary)" : "var(--s-on-surface-variant)",
                fontWeight: d.isToday ? 700 : 400
              }}
            >
              {d.label}
            </span>
          ))}
        </div>
        <div className="relative z-10 mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--s-surface-variant)" }}>
          <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
            {Math.round(weekAvg)}% On Time
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
            Last 7 Days
          </span>
        </div>
      </div>

      {/* Qada breakdown + Sunnah */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative flex flex-col items-center overflow-hidden rounded-2xl p-5 text-center shadow-sm" style={{ background: "var(--s-surface-container)" }}>
          <div className="pointer-events-none absolute right-0 top-0 p-3 opacity-10">
            <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--s-tertiary-container)" }}>
              history
            </span>
          </div>
          <h3 className="z-10 mb-4 w-full text-left text-[13px] font-medium" style={{ color: "var(--s-on-surface-variant)" }}>
            Qada Breakdown
          </h3>
          <div className="relative z-10 my-2 flex h-28 w-28 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--s-surface-variant)" strokeWidth="4" />
              {owedSegments.map((seg) => (
                <circle
                  key={seg.prayer}
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={donutCircumference}
                  strokeDashoffset={-seg.from * donutCircumference}
                  style={{ strokeDasharray: `${(seg.to - seg.from) * donutCircumference} ${donutCircumference}` }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-2xl" style={{ color: "var(--s-primary)" }}>
                {totalOwed}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                {totalOwed === 1 ? "Remaining" : "Remaining"}
              </span>
            </div>
          </div>
          <div className="z-10 mt-4 flex w-full flex-col gap-1 text-left">
            {owedSegments.length === 0 && (
              <p className="text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
                All caught up, alhamdulillah.
              </p>
            )}
            {owedSegments.map((seg) => (
              <div key={seg.prayer} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                <span className="flex-1 text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
                  {PRAYER_LABELS[seg.prayer]}
                </span>
                <span className="text-[11px] font-bold" style={{ color: "var(--s-on-surface)" }}>
                  {owed[seg.prayer]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-2xl p-5 shadow-[0_4px_16px_rgba(22,52,34,0.15)]" style={{ background: "var(--s-primary)" }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at top right, color-mix(in srgb, var(--s-primary-fixed) 20%, transparent), transparent)" }}
          />
          <h3 className="z-10 mb-auto text-[13px] font-medium" style={{ color: "var(--s-primary-fixed-dim)" }}>
            Sunnah Completed
          </h3>
          <div className="z-10 mt-6 flex flex-col gap-1">
            <span className="text-4xl font-headline" style={{ color: "var(--s-on-primary)" }}>
              {sunnah.prayedWithSunnah}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-primary-fixed-dim)" }}>
              This month
            </span>
          </div>
          <div className="z-10 mt-4 flex -space-x-2">
            {Array.from({ length: Math.min(3, sunnah.prayedWithSunnah || 1) }).map((_, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "var(--s-primary-container)", border: "2px solid var(--s-primary)" }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: "var(--s-on-primary-container)" }}>
                  star
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completion card */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
              Completion rate
            </p>
            <h2 className="font-headline text-4xl" style={{ color: "var(--s-primary)" }}>
              {pct.toFixed(1)}
              <span className="text-lg" style={{ color: "var(--s-on-surface-variant)" }}>%</span>
            </h2>
          </div>
          <div className="flex items-center rounded-full p-1" style={{ background: "var(--s-surface-container-high)" }}>
            {(["month", "all"] as const).map((r) => (
              <button
                key={r}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={
                  range === r
                    ? { background: "var(--s-primary)", color: "var(--s-on-primary)" }
                    : { color: "var(--s-on-surface-variant)" }
                }
                onClick={() => setRange(r)}
              >
                {r === "month" ? "Month" : "All-time"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--s-surface-container-high)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: "var(--s-primary)" }}
          />
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
          {completion.prayed}/{completion.total} prayers
        </p>
      </div>

      {/* Personal best */}
      {(weekCmp || monthCmp) && (
        <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
          <h3 className="mb-4 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            Personal best
          </h3>
          <div className="flex flex-col gap-3">
            {weekCmp && (
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "var(--s-surface-container-lowest)" }}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                    This week
                  </p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: "var(--s-on-surface)" }}>
                    {weekCmp.currentPct.toFixed(0)}%
                  </p>
                  <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                    Best week: {weekCmp.bestPct.toFixed(0)}%
                  </p>
                </div>
                {weekCmp.isNewBest && (
                  <span
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: "var(--s-tertiary-container)", color: "var(--s-on-tertiary-container)" }}
                  >
                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                    New best
                  </span>
                )}
              </div>
            )}
            {monthCmp && (
              <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "var(--s-surface-container-lowest)" }}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                    This month
                  </p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: "var(--s-on-surface)" }}>
                    {monthCmp.currentPct.toFixed(0)}%
                  </p>
                  <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                    Best month: {monthCmp.bestPct.toFixed(0)}%
                  </p>
                </div>
                {monthCmp.isNewBest && (
                  <span
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: "var(--s-tertiary-container)", color: "var(--s-on-tertiary-container)" }}
                  >
                    <span className="material-symbols-outlined text-sm">emoji_events</span>
                    New best
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missed breakdown */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div className="mb-6">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            Missed Prayers
          </h3>
          <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            Last 30 days, by prayer
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {PRAYERS.map((p) => {
            const count = missed[p];
            const width = count === 0 ? 0 : Math.max(12, (count / maxMissed) * 100);
            return (
              <div key={p} className="flex flex-col gap-1.5">
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface)" }}>
                    {PRAYER_LABELS[p]}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                    {count === 0 ? "None missed" : `${count} missed`}
                  </span>
                </div>
                <div className="flex h-3 w-full items-center rounded-full px-0.5" style={{ background: "var(--s-surface-container-high)" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${width}%`, background: BAR_COLORS[p], opacity: count === 0 ? 0 : 1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container-low)" }}>
        <h3 className="mb-4 font-headline text-xl" style={{ color: "var(--s-primary)" }}>
          Milestones
        </h3>
        <ul className="flex flex-col gap-4">
          <li className="flex items-start gap-4" style={{ opacity: longest >= 7 ? 1 : 0.5 }}>
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
              style={{ background: longest >= 7 ? "var(--s-secondary-container)" : "var(--s-surface-variant)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: longest >= 7 ? "var(--s-on-secondary-container)" : "var(--s-outline)" }}
              >
                {longest >= 7 ? "workspace_premium" : "lock"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
                7-day streak
              </span>
              <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                {longest >= 7 ? `Longest streak: ${longest} days` : `${7 - longest} more days to go`}
              </span>
            </div>
          </li>
          <li className="flex items-start gap-4" style={{ opacity: sunnah.prayedWithSunnah >= 100 ? 1 : 0.5 }}>
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
              style={{ background: sunnah.prayedWithSunnah >= 100 ? "var(--s-secondary-container)" : "var(--s-surface-variant)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: sunnah.prayedWithSunnah >= 100 ? "var(--s-on-secondary-container)" : "var(--s-outline)" }}
              >
                {sunnah.prayedWithSunnah >= 100 ? "workspace_premium" : "lock"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
                100 Sunnahs
              </span>
              <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                {sunnah.prayedWithSunnah >= 100
                  ? "Completed this month"
                  : `${100 - sunnah.prayedWithSunnah} more to go this month`}
              </span>
            </div>
          </li>
          <li className="flex items-start gap-4" style={{ opacity: streak >= 30 ? 1 : 0.5 }}>
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
              style={{ background: streak >= 30 ? "var(--s-secondary-container)" : "var(--s-surface-variant)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: streak >= 30 ? "var(--s-on-secondary-container)" : "var(--s-outline)" }}
              >
                {streak >= 30 ? "workspace_premium" : "lock"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
                30 Days, All 5 Prayers
              </span>
              <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                {streak >= 30 ? "Completed — Alhamdulillah!" : `Current streak: ${streak} days`}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
