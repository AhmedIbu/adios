import { useMemo } from "react";
import type { Prayer, PrayerLog, QadaLog } from "../../lib/salah";
import { PRAYERS, PRAYER_LABELS, qadaBacklog, qadaOwed } from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
  qadaLogs: QadaLog[];
  onLogQada: (prayer: Prayer) => void;
}

export function SalahQada({ logs, qadaLogs, onLogQada }: Props) {
  const owed = useMemo(() => qadaOwed(logs, qadaLogs), [logs, qadaLogs]);
  const totalOwed = PRAYERS.reduce((sum, p) => sum + owed[p], 0);
  const totalEverMissed = useMemo(
    () => logs.filter((l) => l.status === "missed").length,
    [logs]
  );
  const overallPct = totalEverMissed > 0 ? Math.min(100, ((totalEverMissed - totalOwed) / totalEverMissed) * 100) : 100;
  const recent = qadaLogs.slice(0, 5);
  const backlog = useMemo(() => qadaBacklog(logs, qadaLogs), [logs, qadaLogs]);

  return (
    <section className="flex flex-col gap-6 pb-6">
      {/* Overview */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 opacity-10">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <path
              d="M100 0L122.451 77.5486L200 100L122.451 122.451L100 200L77.5486 122.451L0 100L77.5486 77.5486L100 0Z"
              fill="var(--s-primary)"
            />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col gap-2">
          <h2 className="font-headline text-2xl" style={{ color: "var(--s-on-surface)" }}>
            Patience &amp; Persistence
          </h2>
          <p className="max-w-[280px] text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            "Take small steps consistently, for Allah loves the deeds done with persistence, even
            if they are few."
          </p>
        </div>
        <div className="relative z-10 mt-2 flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
              Overall Progress
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--s-primary)" }}>
              {totalOwed} Left
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--s-surface-variant)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${overallPct}%`, background: "var(--s-primary)", boxShadow: "0 0 8px rgba(22,52,34,0.4)" }}
            />
          </div>
        </div>
      </div>

      {/* Log Qada tiles */}
      <div className="flex flex-col gap-3">
        <h3 className="px-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
          Log Qada
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {PRAYERS.map((p) => {
            const meta = PRAYER_META[p];
            return (
              <div
                key={p}
                className="flex items-center justify-between gap-4 rounded-2xl p-5 shadow-sm transition-transform active:scale-[0.98]"
                style={{ background: "var(--s-surface-container-lowest)" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
                    style={{ background: "var(--s-primary-container)" }}
                  >
                    <span className="material-symbols-outlined text-[24px]" style={{ color: "var(--s-on-primary-container)" }}>
                      {meta.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
                      {PRAYER_LABELS[p]}
                    </span>
                    <span className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
                      {owed[p]} owed
                    </span>
                  </div>
                </div>
                <button
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-full shadow-md transition-transform active:scale-95 disabled:opacity-40"
                  style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
                  onClick={() => onLogQada(p)}
                  disabled={owed[p] === 0}
                  aria-label={`Log a ${PRAYER_LABELS[p]} qada`}
                >
                  <span className="material-symbols-outlined text-[28px]">remove</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backlog — oldest missed prayers still outstanding, burn-down style */}
      {backlog.length > 0 && (
        <div>
          <h3 className="mb-1 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            Backlog
          </h3>
          <p className="mb-4 text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            Oldest missed prayers first — since qada isn't tied to a specific day, this pays off
            each prayer's earliest misses first.
          </p>
          <div className="flex flex-col gap-2">
            {backlog.slice(0, 20).map((item, i) => {
              const meta = PRAYER_META[item.prayer];
              return (
                <div
                  key={`${item.day}-${item.prayer}-${i}`}
                  className="flex items-center justify-between rounded-xl p-3.5 shadow-sm"
                  style={{ background: "var(--s-surface-container)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "var(--s-primary-container)" }}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ color: "var(--s-on-primary-container)" }}>
                        {meta.icon}
                      </span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                      {PRAYER_LABELS[item.prayer]}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                    {new Date(item.day + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </p>
                </div>
              );
            })}
            {backlog.length > 20 && (
              <p className="pt-1 text-center text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                +{backlog.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent logs */}
      {recent.length > 0 && (
        <div>
          <h3 className="mb-4 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            Recovery Progress
          </h3>
          <div className="flex flex-col gap-2">
            {recent.map((q) => {
              const meta = PRAYER_META[q.prayer];
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-xl p-3.5 shadow-sm"
                  style={{ background: "var(--s-surface-container)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "var(--s-primary-container)" }}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ color: "var(--s-on-primary-container)" }}>
                        {meta.icon}
                      </span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                      {PRAYER_LABELS[q.prayer]} Qada
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                    {new Date(q.completed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
