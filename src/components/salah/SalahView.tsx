import { Suspense, lazy, useEffect, useState, useCallback } from "react";
import type { Prayer, PrayerLog, PrayerStatus, QadaLog } from "../../lib/salah";
import { listPrayerLogs, listQadaLogs, logQada, setPrayerStatus } from "../../lib/salah";
import { vibrate } from "../../lib/haptics";
import { SalahToday } from "./SalahToday";
import { SalahHistory } from "./SalahHistory";
import { SalahQada } from "./SalahQada";
import { SalahReminder } from "./SalahReminder";

// Pulls in recharts — lazy so its weight only loads when Stats is opened.
const SalahStats = lazy(() => import("./SalahStats").then((m) => ({ default: m.SalahStats })));

type Tab = "today" | "history" | "qada" | "stats" | "reminder";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "history", label: "History", icon: "history" },
  { id: "qada", label: "Qada", icon: "event_busy" },
  { id: "stats", label: "Stats", icon: "insights" },
  { id: "reminder", label: "Reminder", icon: "auto_stories" }
];

export function SalahView() {
  const [tab, setTab] = useState<Tab>("today");
  const [logs, setLogs] = useState<PrayerLog[]>([]);
  const [qadaLogs, setQadaLogs] = useState<QadaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPrayerLogs(), listQadaLogs()])
      .then(([p, q]) => {
        setLogs(p);
        setQadaLogs(q);
        setLoadError(null);
      })
      .catch((e) => {
        console.error(e);
        setLoadError(
          "Couldn't load your prayer data. If this is the first run, make sure supabase/salah-tracker.sql has been applied."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSetStatus = useCallback(
    async (day: string, prayer: Prayer, status: PrayerStatus) => {
      // Optimistic: swap in a temp row immediately, reconcile with the real one.
      const tempId = `temp-${day}-${prayer}`;
      setLogs((ls) => {
        const rest = ls.filter((l) => !(l.day === day && l.prayer === prayer));
        return [...rest, { id: tempId, day, prayer, status }];
      });
      try {
        const saved = await setPrayerStatus(day, prayer, status);
        setLogs((ls) => ls.map((l) => (l.id === tempId ? saved : l)));
      } catch (e) {
        console.error(e);
        setLogs((ls) => ls.filter((l) => l.id !== tempId));
        alert("Couldn't save — check your connection.");
      }
    },
    []
  );

  const handleLogQada = useCallback(async (prayer: Prayer) => {
    try {
      const saved = await logQada(prayer);
      setQadaLogs((qs) => [saved, ...qs]);
      vibrate(15);
    } catch (e) {
      console.error(e);
      alert("Couldn't log — check your connection.");
    }
  }, []);

  return (
    <div className="pb-24">
      {loading && (
        <p className="px-3 py-10 text-center text-sm text-on-surface-dim">Loading…</p>
      )}
      {!loading && loadError && (
        <p className="px-3 py-10 text-center text-sm text-error">{loadError}</p>
      )}
      {!loading && !loadError && (
        <>
          {tab === "today" && <SalahToday logs={logs} onSetStatus={handleSetStatus} />}
          {tab === "history" && (
            <SalahHistory logs={logs} onSetStatus={handleSetStatus} />
          )}
          {tab === "qada" && (
            <SalahQada logs={logs} qadaLogs={qadaLogs} onLogQada={handleLogQada} />
          )}
          {tab === "stats" && (
            <Suspense
              fallback={<p className="px-3 py-10 text-center text-sm text-on-surface-dim">Loading…</p>}
            >
              <SalahStats logs={logs} qadaLogs={qadaLogs} />
            </Suspense>
          )}
          {tab === "reminder" && <SalahReminder />}
        </>
      )}

      {/* Salah tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-bg/60 backdrop-blur-2xl">
        <div
          className="mx-auto flex max-w-xl items-center justify-around px-4 pt-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className={`relative flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
                  active ? "text-primary" : "text-on-surface-dim/60 hover:text-on-surface"
                }`}
                onClick={() => setTab(t.id)}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${active ? "is-filled" : ""}`}
                >
                  {t.icon}
                </span>
                <span className="mt-1 text-[9px] font-extrabold tracking-widest uppercase">
                  {t.label}
                </span>
                {active && (
                  <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
