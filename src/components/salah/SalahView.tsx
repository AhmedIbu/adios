import { Suspense, lazy, useEffect, useState, useCallback } from "react";
import type { Prayer, PrayerLog, PrayerStatus, QadaLog, SalahSettingsRow } from "../../lib/salah";
import {
  clearPrayerStatus,
  getSalahSettings,
  listPrayerLogs,
  listQadaLogs,
  logQada,
  setPrayerStatus,
  setSunnah,
  upsertSalahSettings
} from "../../lib/salah";
import type { AnsweredDua, Intention, Reflection } from "../../lib/journal";
import {
  addDua,
  intentionAudioUrl,
  listAnsweredDuas,
  listIntentions,
  listReflections,
  markDuaAnswered,
  saveIntentionAudio,
  saveIntentionText,
  saveReflection
} from "../../lib/journal";
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
  const [settings, setSettings] = useState<SalahSettingsRow | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [duas, setDuas] = useState<AnsweredDua[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
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

    // Optional tables — degrade silently if their migration hasn't been run yet.
    getSalahSettings()
      .then(setSettings)
      .catch((e) => console.error(e));
    listReflections()
      .then(setReflections)
      .catch((e) => console.error(e));
    listAnsweredDuas()
      .then(setDuas)
      .catch((e) => console.error(e));
    listIntentions()
      .then(setIntentions)
      .catch((e) => console.error(e));
  }, []);

  const handleSaveSettings = useCallback(async (next: SalahSettingsRow) => {
    const saved = await upsertSalahSettings(next);
    setSettings(saved);
  }, []);

  const handleSaveReflection = useCallback(async (day: string, prompt: string, text: string) => {
    const saved = await saveReflection(day, prompt, text);
    setReflections((rs) => [saved, ...rs.filter((r) => r.day !== day)]);
  }, []);

  const handleAddDua = useCallback(async (text: string) => {
    const saved = await addDua(text);
    setDuas((ds) => [saved, ...ds]);
  }, []);

  const handleMarkDuaAnswered = useCallback(async (id: string) => {
    const saved = await markDuaAnswered(id);
    setDuas((ds) => ds.map((d) => (d.id === id ? saved : d)));
  }, []);

  const handleSaveIntentionText = useCallback(async (day: string, prayer: Prayer, text: string) => {
    const saved = await saveIntentionText(day, prayer, text);
    setIntentions((is) => [saved, ...is.filter((i) => !(i.day === day && i.prayer === prayer))]);
  }, []);

  const handleSaveIntentionAudio = useCallback(async (day: string, prayer: Prayer, blob: Blob) => {
    const saved = await saveIntentionAudio(day, prayer, blob);
    setIntentions((is) => [saved, ...is.filter((i) => !(i.day === day && i.prayer === prayer))]);
  }, []);

  const handleSetStatus = useCallback(
    async (day: string, prayer: Prayer, status: PrayerStatus, khushu?: number) => {
      // Optimistic: swap in a temp row immediately, reconcile with the real one.
      const tempId = `temp-${day}-${prayer}`;
      setLogs((ls) => {
        const rest = ls.filter((l) => !(l.day === day && l.prayer === prayer));
        return [
          ...rest,
          {
            id: tempId,
            day,
            prayer,
            status,
            khushu: khushu ?? null,
            sunnah: false,
            logged_at: new Date().toISOString()
          }
        ];
      });
      try {
        const saved = await setPrayerStatus(day, prayer, status, khushu);
        setLogs((ls) => ls.map((l) => (l.id === tempId ? saved : l)));
      } catch (e) {
        console.error(e);
        setLogs((ls) => ls.filter((l) => l.id !== tempId));
        alert("Couldn't save — check your connection.");
      }
    },
    []
  );

  /** Untoggle a logged prayer entirely — used for the optional Tahajjud slot. */
  const handleClearStatus = useCallback(async (day: string, prayer: Prayer) => {
    const removed = logs.find((l) => l.day === day && l.prayer === prayer);
    setLogs((ls) => ls.filter((l) => !(l.day === day && l.prayer === prayer)));
    try {
      await clearPrayerStatus(day, prayer);
    } catch (e) {
      console.error(e);
      if (removed) setLogs((ls) => [...ls, removed]);
      alert("Couldn't update — check your connection.");
    }
  }, [logs]);

  const handleSetSunnah = useCallback(async (day: string, prayer: Prayer, sunnah: boolean) => {
    setLogs((ls) => ls.map((l) => (l.day === day && l.prayer === prayer ? { ...l, sunnah } : l)));
    try {
      await setSunnah(day, prayer, sunnah);
    } catch (e) {
      console.error(e);
      setLogs((ls) =>
        ls.map((l) => (l.day === day && l.prayer === prayer ? { ...l, sunnah: !sunnah } : l))
      );
      alert("Couldn't save — check your connection.");
    }
  }, []);

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
          {tab === "today" && (
            <SalahToday
              logs={logs}
              onSetStatus={handleSetStatus}
              onClearStatus={handleClearStatus}
              onSetSunnah={handleSetSunnah}
              settings={settings}
              intentions={intentions}
              onSaveIntentionText={handleSaveIntentionText}
              onSaveIntentionAudio={handleSaveIntentionAudio}
              onGetIntentionAudioUrl={intentionAudioUrl}
            />
          )}
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
              <SalahStats
                logs={logs}
                qadaLogs={qadaLogs}
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            </Suspense>
          )}
          {tab === "reminder" && (
            <SalahReminder
              reflections={reflections}
              onSaveReflection={handleSaveReflection}
              duas={duas}
              onAddDua={handleAddDua}
              onMarkDuaAnswered={handleMarkDuaAnswered}
            />
          )}
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
