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
  qadaOwed
} from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
  qadaLogs: QadaLog[];
}

const BAR_COLORS: Record<string, string> = {
  fajr: "bg-tertiary",
  dhuhr: "bg-primary",
  asr: "bg-secondary",
  maghrib: "bg-[#f0a8bf]",
  isha: "bg-primary-container"
};

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

  const missed = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return missedCounts(map, from, to);
  }, [map]);
  const maxMissed = Math.max(1, ...PRAYERS.map((p) => missed[p]));

  const owed = useMemo(() => qadaOwed(logs, qadaLogs), [logs, qadaLogs]);
  const totalOwed = PRAYERS.reduce((sum, p) => sum + owed[p], 0);

  return (
    <section className="space-y-5">
      {/* Streak card */}
      <div className="group relative overflow-hidden rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
          <span className="material-symbols-outlined is-filled text-6xl">
            local_fire_department
          </span>
        </div>
        <p className="mb-1 text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
          Current streak
        </p>
        <h2 className="text-5xl leading-none font-extrabold text-primary">
          {streak} <span className="text-xl opacity-50">{streak === 1 ? "day" : "days"}</span>
        </h2>
        <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-4">
          <span className="material-symbols-outlined text-sm text-primary">trending_up</span>
          <p className="text-[11px] font-extrabold tracking-widest text-primary/70 uppercase">
            Longest: {longest} {longest === 1 ? "day" : "days"}
          </p>
        </div>
      </div>

      {/* Completion card */}
      <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
              Completion rate
            </p>
            <h2 className="text-5xl leading-none font-extrabold text-secondary">
              {pct.toFixed(1)}
              <span className="text-xl opacity-50">%</span>
            </h2>
          </div>
          <div className="flex items-center rounded-full bg-surface-high p-1">
            {(["month", "all"] as const).map((r) => (
              <button
                key={r}
                className={`rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest uppercase transition-colors ${
                  range === r ? "bg-secondary text-on-secondary" : "text-on-surface-dim"
                }`}
                onClick={() => setRange(r)}
              >
                {r === "month" ? "Month" : "All-time"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-surface-high">
          <div
            className="h-full rounded-full bg-secondary shadow-[0_0_12px_rgba(213,187,249,0.4)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] font-bold tracking-widest text-on-surface-dim uppercase">
          {completion.prayed}/{completion.total} prayers
        </p>
      </div>

      {/* Missed breakdown */}
      <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-on-surface">Missed Prayers</h3>
          <p className="text-sm text-on-surface-dim">Last 30 days, by prayer</p>
        </div>
        <div className="space-y-5">
          {PRAYERS.map((p) => {
            const count = missed[p];
            const width = count === 0 ? 0 : Math.max(12, (count / maxMissed) * 100);
            return (
              <div key={p} className="space-y-1.5">
                <div className="flex items-end justify-between">
                  <span className="text-[11px] font-extrabold tracking-widest text-on-surface uppercase">
                    {PRAYER_LABELS[p]}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-on-surface-dim uppercase">
                    {count === 0 ? "None missed" : `${count} missed`}
                  </span>
                </div>
                <div className="flex h-3 w-full items-center rounded-full bg-surface-high/50 px-0.5">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${BAR_COLORS[p]} ${
                      count === 0 ? "opacity-0" : ""
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Qada summary */}
      {totalOwed > 0 && (
        <div className="flex items-start gap-4 rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
          <div className="flex-none rounded-full bg-secondary/10 p-3 text-secondary">
            <span className="material-symbols-outlined">event_busy</span>
          </div>
          <div>
            <h4 className="mb-1 text-lg font-bold text-on-surface">Qada remaining</h4>
            <p className="text-sm leading-relaxed text-on-surface-dim">
              You have <span className="font-bold text-secondary">{totalOwed}</span>{" "}
              {totalOwed === 1 ? "prayer" : "prayers"} left to make up — log them on the Qada
              tab as you go.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
