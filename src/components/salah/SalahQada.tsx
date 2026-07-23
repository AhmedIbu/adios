import { useMemo, useState } from "react";
import type { Prayer, PrayerLog, QadaLog } from "../../lib/salah";
import { PRAYERS, PRAYER_LABELS, qadaBacklog, qadaOwed } from "../../lib/salah";
import { PRAYER_META } from "./meta";

interface Props {
  logs: PrayerLog[];
  qadaLogs: QadaLog[];
  onLogQada: (prayer: Prayer) => void;
}

export function SalahQada({ logs, qadaLogs, onLogQada }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
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
          Everyone falls behind sometimes. Log what you make up here, at your own pace.
        </p>
      </div>

      {/* Owed tiles */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        {PRAYERS.map((p) => {
          const meta = PRAYER_META[p];
          return (
            <div
              key={p}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-surface-glass p-5 backdrop-blur-md"
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
            </div>
          );
        })}
      </div>

      {/* Log button */}
      <div className="mb-2 flex flex-col items-center gap-4">
        <button
          className="group relative flex h-14 w-full max-w-sm items-center justify-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-[0.97]"
          onClick={() => setSheetOpen(true)}
        >
          <span className="material-symbols-outlined text-2xl text-primary transition-transform group-hover:rotate-90">
            add_circle
          </span>
          <span className="text-base font-bold text-primary">Log a Qada prayer</span>
        </button>
        <p className="text-[10px] font-bold tracking-[0.15em] text-on-surface-dim/60 uppercase">
          Total remaining: {totalOwed} {totalOwed === 1 ? "prayer" : "prayers"}
        </p>
      </div>

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

      {/* Prayer picker sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <h3 className="px-5 py-3 text-center text-base font-semibold text-on-surface">
              Which prayer did you make up?
            </h3>
            <ul className="pb-2">
              {PRAYERS.map((p) => {
                const meta = PRAYER_META[p];
                return (
                  <li key={p}>
                    <button
                      className="flex w-full items-center gap-4 px-6 py-3.5 text-left hover:bg-white/5"
                      onClick={() => {
                        onLogQada(p);
                        setSheetOpen(false);
                      }}
                    >
                      <span className={`material-symbols-outlined ${meta.color}`}>
                        {meta.icon}
                      </span>
                      <span className="flex-1 text-base font-semibold text-on-surface">
                        {PRAYER_LABELS[p]}
                      </span>
                      {owed[p] > 0 && (
                        <span className="text-xs font-bold text-on-surface-dim">
                          {owed[p]} owed
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
