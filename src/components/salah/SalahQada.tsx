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
  const recent = qadaLogs.slice(0, 5);
  const backlog = useMemo(() => qadaBacklog(logs, qadaLogs), [logs, qadaLogs]);

  return (
    <section>
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-on-surface">
          Qada Recovery
        </h2>
        <p className="mx-auto max-w-sm text-sm text-on-surface-dim">
          Everyone falls behind sometimes. Tap a prayer below each time you make one up.
        </p>
      </div>

      {/* Owed tiles — tap to log a make-up for that prayer */}
      <div className="mb-2 grid grid-cols-2 gap-3">
        {PRAYERS.map((p) => {
          const meta = PRAYER_META[p];
          return (
            <button
              key={p}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-surface-glass p-5 text-left backdrop-blur-md transition-all active:scale-[0.97] hover:border-primary/30"
              onClick={() => onLogQada(p)}
            >
              <div
                className={`absolute -top-4 -right-4 h-16 w-16 rounded-full ${meta.iconBg} blur-2xl`}
              />
              <span className={`material-symbols-outlined mb-3 block text-3xl ${meta.color}`}>
                {meta.icon}
              </span>
              <p
                className={`mb-1 text-[11px] font-extrabold tracking-widest uppercase ${meta.color}`}
              >
                {PRAYER_LABELS[p]}
              </p>
              <p className="text-xl font-bold text-on-surface">
                {owed[p]} <span className="text-sm font-normal text-on-surface-dim">owed</span>
              </p>
            </button>
          );
        })}
      </div>
      <p className="mb-8 text-center text-[10px] font-bold tracking-[0.15em] text-on-surface-dim/60 uppercase">
        Total remaining: {totalOwed} {totalOwed === 1 ? "prayer" : "prayers"}
      </p>

      {/* Backlog — oldest missed prayers still outstanding, burn-down style */}
      {backlog.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-1 text-lg font-bold text-on-surface">Backlog</h3>
          <p className="mb-4 text-sm text-on-surface-dim">
            Oldest missed prayers first — since qada isn't tied to a specific day, this pays
            off each prayer's earliest misses first.
          </p>
          <div className="space-y-2">
            {backlog.slice(0, 20).map((item, i) => {
              const meta = PRAYER_META[item.prayer];
              return (
                <div
                  key={`${item.day}-${item.prayer}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-surface-glass p-3.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.iconBg} ${meta.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">
                      {PRAYER_LABELS[item.prayer]}
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-dim">
                    {new Date(item.day + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    })}
                  </p>
                </div>
              );
            })}
            {backlog.length > 20 && (
              <p className="pt-1 text-center text-xs text-on-surface-dim">
                +{backlog.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent logs */}
      {recent.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 text-lg font-bold text-on-surface">Recovery Progress</h3>
          <div className="space-y-2">
            {recent.map((q) => {
              const meta = PRAYER_META[q.prayer];
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-surface-glass p-3.5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.iconBg} ${meta.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">done_all</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">
                      {PRAYER_LABELS[q.prayer]} Qada
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-dim">
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
