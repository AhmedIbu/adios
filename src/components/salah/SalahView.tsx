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
  deleteDua,
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
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { SalahToday } from "./SalahToday";
import { SalahHistory } from "./SalahHistory";
import { SalahQada } from "./SalahQada";
import { SalahPrayerReminderBanner } from "./SalahPrayerReminderBanner";
import { SalahSkeleton } from "./SalahSkeleton";

// Heavier/less-visited tabs — lazy so their weight only loads when opened.
const SalahStats = lazy(() => import("./SalahStats").then((m) => ({ default: m.SalahStats })));
const SalahSins = lazy(() => import("./SalahSins").then((m) => ({ default: m.SalahSins })));
const SalahMore = lazy(() => import("./SalahMore").then((m) => ({ default: m.SalahMore })));

type Tab = "today" | "history" | "qada" | "stats" | "sins" | "more";

const TABS: { id: Tab; label: string; icon: string; title: string }[] = [
  { id: "today", label: "Today", icon: "today", title: "Today" },
  { id: "history", label: "History", icon: "calendar_month", title: "History" },
  { id: "qada", label: "Qada", icon: "history", title: "Qada" },
  { id: "stats", label: "Stats", icon: "bar_chart", title: "Stats" },
  { id: "sins", label: "Sins", icon: "heart_broken", title: "Sins" },
  { id: "more", label: "More", icon: "more_horiz", title: "More" }
];

interface Props {
  /** Omitted entirely on a Salah-only build (the family APK) — no app to switch to. */
  onSwitchApp?: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function SalahView({ onSwitchApp, theme, onToggleTheme }: Props) {
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

  const refreshData = useCallback(async () => {
    try {
      const [p, q] = await Promise.all([listPrayerLogs(), listQadaLogs()]);
      setLogs(p);
      setQadaLogs(q);
    } catch (e) {
      console.error(e);
    }
    Promise.all([getSalahSettings(), listReflections(), listAnsweredDuas(), listIntentions()])
      .then(([s, r, d, i]) => {
        setSettings(s);
        setReflections(r);
        setDuas(d);
        setIntentions(i);
      })
      .catch((e) => console.error(e));
  }, []);

  const pullToRefresh = usePullToRefresh(refreshData);

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
    try {
      const saved = await markDuaAnswered(id);
      setDuas((ds) => ds.map((d) => (d.id === id ? saved : d)));
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    }
  }, []);

  const handleDeleteDua = useCallback(async (id: string) => {
    const removed = duas.find((d) => d.id === id);
    setDuas((ds) => ds.filter((d) => d.id !== id));
    try {
      await deleteDua(id);
    } catch (e) {
      console.error(e);
      if (removed) setDuas((ds) => [removed, ...ds]);
      alert("Couldn't delete — check your connection.");
    }
  }, [duas]);

  const handleSaveIntentionText = useCallback(async (day: string, prayer: Prayer, text: string) => {
    const saved = await saveIntentionText(day, prayer, text);
    setIntentions((is) => [saved, ...is.filter((i) => !(i.day === day && i.prayer === prayer))]);
  }, []);

  const handleSaveIntentionAudio = useCallback(async (day: string, prayer: Prayer, blob: Blob) => {
    const saved = await saveIntentionAudio(day, prayer, blob);
    setIntentions((is) => [saved, ...is.filter((i) => !(i.day === day && i.prayer === prayer))]);
  }, []);

  const handleSetStatus = useCallback(
    async (day: string, prayer: Prayer, status: PrayerStatus) => {
      vibrate(10);
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
            sunnah: false,
            logged_at: new Date().toISOString()
          }
        ];
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

  /** Returns whether the log actually saved, so the caller can decide whether to confirm success. */
  const handleLogQada = useCallback(async (prayer: Prayer): Promise<boolean> => {
    try {
      const saved = await logQada(prayer);
      setQadaLogs((qs) => [saved, ...qs]);
      vibrate(15);
      return true;
    } catch (e) {
      console.error(e);
      alert("Couldn't log — check your connection.");
      return false;
    }
  }, []);

  const activeTitle = TABS.find((t) => t.id === tab)?.title ?? "Salah";

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--s-surface)", color: "var(--s-on-surface)" }}
    >
      {/* Header */}
      <header
        className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--s-surface) 60%, transparent)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.02)"
        }}
      >
        <div className="flex h-16 items-center justify-between px-5">
          {onSwitchApp ? (
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:scale-90"
              style={{ color: "var(--s-on-surface)" }}
              onClick={onSwitchApp}
              aria-label="Switch app"
              title="Switch app"
            >
              <span className="material-symbols-outlined text-2xl">apps</span>
            </button>
          ) : (
            <div className="h-11 w-11" />
          )}
          <h1
            className="font-headline text-2xl tracking-tight"
            style={{ color: "var(--s-primary)" }}
          >
            {activeTitle}
          </h1>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-90"
            style={{ color: "var(--s-on-surface)" }}
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        className="s-mesh relative w-full flex-1 px-5"
        style={{
          paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom, 0px))"
        }}
        {...pullToRefresh.handlers}
      >
        {(pullToRefresh.pullY > 0 || pullToRefresh.refreshing) && (
          <div
            className="pointer-events-none absolute left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full shadow-md"
            style={{
              top: "calc(4rem + env(safe-area-inset-top, 0px) + 0.5rem)",
              background: "var(--s-surface-container-high)",
              opacity: Math.min(1, pullToRefresh.pullY / 64)
            }}
          >
            <span
              className={`material-symbols-outlined text-lg ${pullToRefresh.refreshing ? "animate-spin" : ""}`}
              style={{
                color: "var(--s-primary)",
                transform: !pullToRefresh.refreshing ? `rotate(${pullToRefresh.pullY * 3}deg)` : undefined
              }}
            >
              refresh
            </span>
          </div>
        )}
        <div
          className="animate-app-in pt-6"
          style={{
            transform: pullToRefresh.pullY > 0 ? `translateY(${pullToRefresh.pullY}px)` : undefined,
            transition: pullToRefresh.pullY === 0 ? "transform 0.2s ease-out" : "none"
          }}
        >
          {!loading && !loadError && (
            <SalahPrayerReminderBanner logs={logs} settings={settings} onSetStatus={handleSetStatus} />
          )}
          {loading && <SalahSkeleton />}
          {!loading && loadError && (
            <p className="px-3 py-10 text-center text-sm" style={{ color: "var(--s-error)" }}>
              {loadError}
            </p>
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
                <SalahHistory logs={logs} onSetStatus={handleSetStatus} onSetSunnah={handleSetSunnah} />
              )}
              {tab === "qada" && (
                <SalahQada logs={logs} qadaLogs={qadaLogs} onLogQada={handleLogQada} />
              )}
              {tab === "stats" && (
                <Suspense
                  fallback={<SalahSkeleton />}
                >
                  <SalahStats logs={logs} qadaLogs={qadaLogs} />
                </Suspense>
              )}
              {tab === "sins" && (
                <Suspense
                  fallback={<SalahSkeleton />}
                >
                  <SalahSins />
                </Suspense>
              )}
              {tab === "more" && (
                <Suspense
                  fallback={<SalahSkeleton />}
                >
                  <SalahMore
                    reflections={reflections}
                    onSaveReflection={handleSaveReflection}
                    duas={duas}
                    onAddDua={handleAddDua}
                    onMarkDuaAnswered={handleMarkDuaAnswered}
                    onDeleteDua={handleDeleteDua}
                    settings={settings}
                    onSaveSettings={handleSaveSettings}
                  />
                </Suspense>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 backdrop-blur-2xl"
        style={{
          background: "color-mix(in srgb, var(--s-surface) 80%, transparent)",
          boxShadow: "0 -4px 24px rgba(22,52,34,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)"
        }}
      >
        <div className="flex h-20 items-center justify-around px-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className={`flex w-14 flex-col items-center gap-1 transition-all duration-300 ${active ? "scale-110" : ""}`}
                style={{ color: active ? "var(--s-primary)" : "var(--s-on-surface-variant)" }}
                onClick={() => setTab(t.id)}
              >
                <span className="material-symbols-outlined text-[26px]">{t.icon}</span>
                <span className="text-[12px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
