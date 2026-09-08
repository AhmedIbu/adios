import { useMemo, useRef, useState } from "react";
import type { CorePrayer, PrayerLog, QadaLog } from "../../lib/salah";
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
  monthlyCompletionTrend,
  perPrayerOnTimeRate,
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

  const trend = useMemo(() => monthlyCompletionTrend(map, new Date(), 6), [map]);
  const trendPath = useMemo(() => {
    if (trend.length < 2) return "";
    const w = 280;
    const h = 56;
    const stepX = w / (trend.length - 1);
    return trend
      .map((t, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(h - (t.pct / 100) * h).toFixed(1)}`)
      .join(" ");
  }, [trend]);

  const onTimeRate = useMemo(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return perPrayerOnTimeRate(logs, from, today);
  }, [logs]);

  const milestones = useMemo(() => {
    const everMissed = logs.some((l) => l.status === "missed");
    const allOnTime = logs.length > 0 && PRAYERS.every((p) => onTimeRate[p] >= 0.8);
    return [
      {
        key: "streak7",
        title: "7-Day Streak",
        icon: "workspace_premium",
        achieved: longest >= 7,
        doneLabel: `Longest streak: ${longest} days`,
        lockedLabel: `${7 - longest} more day${7 - longest === 1 ? "" : "s"} to go`
      },
      {
        key: "streak30",
        title: "30-Day Streak",
        icon: "military_tech",
        achieved: longest >= 30,
        doneLabel: "Completed — Alhamdulillah!",
        lockedLabel: `Longest streak: ${longest} days`
      },
      {
        key: "streak100",
        title: "100-Day Streak",
        icon: "emoji_events",
        achieved: longest >= 100,
        doneLabel: "A full season of consistency — Alhamdulillah!",
        lockedLabel: `Longest streak: ${longest} days`
      },
      {
        key: "sunnah100",
        title: "100 Sunnahs",
        icon: "auto_awesome",
        achieved: sunnah.prayedWithSunnah >= 100,
        doneLabel: "Completed this month",
        lockedLabel: `${100 - sunnah.prayedWithSunnah} more to go this month`
      },
      {
        key: "qadaCleared",
        title: "Qada Cleared",
        icon: "task_alt",
        achieved: everMissed && totalOwed === 0,
        doneLabel: "All caught up — nothing owed",
        lockedLabel: `${totalOwed} prayer${totalOwed === 1 ? "" : "s"} left`
      },
      {
        key: "qada50",
        title: "50 Qada Logged",
        icon: "history_edu",
        achieved: qadaLogs.length >= 50,
        doneLabel: `${qadaLogs.length} logged in total`,
        lockedLabel: `${qadaLogs.length} of 50 logged`
      },
      {
        key: "onTime",
        title: "On-Time Master",
        icon: "schedule",
        achieved: allOnTime,
        doneLabel: "80%+ on-time across every prayer this month",
        lockedLabel: "Reach 80% on-time for every prayer this month"
      }
    ];
  }, [longest, sunnah, totalOwed, qadaLogs, logs, onTimeRate]);

  const [sharing, setSharing] = useState(false);
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);

  async function shareProgress() {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = 800;
      const H = 1000;
      canvas.width = W;
      canvas.height = H;

      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--s-surface").trim() || "#121412";
      const surface = styles.getPropertyValue("--s-surface-container").trim() || "#1e201e";
      const primary = styles.getPropertyValue("--s-primary").trim() || "#b2cdb6";
      const onSurface = styles.getPropertyValue("--s-on-surface").trim() || "#e2e3df";
      const onVariant = styles.getPropertyValue("--s-on-surface-variant").trim() || "#c2c8c1";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = onVariant;
      ctx.font = "600 22px Inter, sans-serif";
      ctx.fillText("MY SALAH PROGRESS", 60, 90);

      ctx.fillStyle = primary;
      ctx.font = "400 64px 'Libre Caslon Text', serif";
      ctx.fillText(`${streak}`, 60, 190);
      ctx.fillStyle = onVariant;
      ctx.font = "500 24px Inter, sans-serif";
      ctx.fillText(streak === 1 ? "day streak" : "day streak", 200, 178);

      const stats: [string, string][] = [
        ["Completion", `${pct.toFixed(0)}%`],
        ["Longest streak", `${longest} days`],
        ["Qada remaining", `${totalOwed}`],
        ["Sunnah this month", `${sunnah.prayedWithSunnah}`]
      ];
      let y = 300;
      for (const [label, value] of stats) {
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.roundRect(60, y, W - 120, 100, 20);
        ctx.fill();
        ctx.fillStyle = onVariant;
        ctx.font = "500 20px Inter, sans-serif";
        ctx.fillText(label.toUpperCase(), 90, y + 40);
        ctx.fillStyle = onSurface;
        ctx.font = "600 36px Inter, sans-serif";
        ctx.fillText(value, 90, y + 78);
        y += 120;
      }

      ctx.fillStyle = onVariant;
      ctx.font = "400 18px Inter, sans-serif";
      ctx.fillText(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), 60, H - 50);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const file = new File([blob], "salah-progress.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Salah Progress" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "salah-progress.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") console.error(e);
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="flex flex-col gap-5 pb-6">
      <canvas ref={shareCanvasRef} className="hidden" aria-hidden="true" />

      <button
        className="flex items-center justify-center gap-2 self-end rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-transform active:scale-95 disabled:opacity-60"
        style={{ background: "var(--s-surface-container-high)", color: "var(--s-on-surface)" }}
        onClick={shareProgress}
        disabled={sharing}
      >
        <span className="material-symbols-outlined text-[18px]">{sharing ? "hourglass_top" : "share"}</span>
        {sharing ? "Preparing…" : "Share progress"}
      </button>

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
            Last 7 days
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
                  strokeDasharray={`${(seg.to - seg.from) * donutCircumference} ${donutCircumference}`}
                  strokeDashoffset={-seg.from * donutCircumference}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-2xl" style={{ color: "var(--s-primary)" }}>
                {totalOwed}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                Remaining
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

      {/* 6-month trend */}
      {trend.some((t) => t.pct > 0) && (
        <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
          <h3 className="mb-4 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            6-Month Trend
          </h3>
          <svg viewBox="0 0 280 56" className="w-full" preserveAspectRatio="none">
            <path d={trendPath} fill="none" stroke="var(--s-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-2 flex justify-between">
            {trend.map((t, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--s-on-surface-variant)" }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-prayer on-time rate */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div className="mb-6">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            On-Time by Prayer
          </h3>
          <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            This month, share of prayers logged on time
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {PRAYERS.map((p: CorePrayer) => {
            const rate = Math.round(onTimeRate[p] * 100);
            return (
              <div key={p} className="flex flex-col gap-1.5">
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface)" }}>
                    {PRAYER_LABELS[p]}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                    {rate}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full px-0.5" style={{ background: "var(--s-surface-container-high)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${rate}%`, background: BAR_COLORS[p] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
        <div className="mb-4 flex items-end justify-between">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-primary)" }}>
            Milestones
          </h3>
          <span className="text-xs font-semibold" style={{ color: "var(--s-on-surface-variant)" }}>
            {milestones.filter((m) => m.achieved).length}/{milestones.length}
          </span>
        </div>
        <ul className="flex flex-col gap-4">
          {milestones.map((m) => (
            <li key={m.key} className="flex items-start gap-4" style={{ opacity: m.achieved ? 1 : 0.5 }}>
              <div
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
                style={{ background: m.achieved ? "var(--s-secondary-container)" : "var(--s-surface-variant)" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: m.achieved ? "var(--s-on-secondary-container)" : "var(--s-outline)" }}
                >
                  {m.achieved ? m.icon : "lock"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold" style={{ color: "var(--s-on-surface)" }}>
                  {m.title}
                </span>
                <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                  {m.achieved ? m.doneLabel : m.lockedLabel}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
