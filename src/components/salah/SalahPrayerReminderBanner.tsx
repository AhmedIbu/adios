import { useEffect, useMemo, useState } from "react";
import type { Prayer, PrayerLog, PrayerStatus, SalahSettingsRow } from "../../lib/salah";
import { PRAYERS, PRAYER_LABELS, buildLogMap, toDayString } from "../../lib/salah";
import { computeDayTimes, hasLocation } from "../../lib/prayertimes";
import { PRAYER_META } from "./meta";

// How long after adhan the reminder stays up, unprompted — long enough to
// notice it during normal app use, short enough that it stops being useful
// once the window for "on time" has clearly passed.
const WINDOW_MINUTES = 30;
const DISMISSED_KEY = "salah:dismissed-reminders";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

interface Props {
  logs: PrayerLog[];
  settings: SalahSettingsRow | null;
  onSetStatus: (day: string, prayer: Prayer, status: PrayerStatus) => void;
}

export function SalahPrayerReminderBanner({ logs, settings, onSetStatus }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const todayStr = toDayString(now);
  const map = useMemo(() => buildLogMap(logs), [logs]);
  const dayEntry = map.get(todayStr);
  const times = settings && hasLocation(settings) ? computeDayTimes(settings, now) : null;

  const due = useMemo(() => {
    if (!times) return null;
    for (const p of PRAYERS) {
      if (dayEntry?.[p]) continue;
      if (dismissed.has(`${todayStr}-${p}`)) continue;
      const minutesSince = (now.getTime() - times[p].getTime()) / 60000;
      if (minutesSince >= 0 && minutesSince <= WINDOW_MINUTES) return p;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, dayEntry, dismissed, todayStr, now]);

  if (!due) return null;

  function persistDismissed(next: Set<string>) {
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {
      // ignore — dismissal state is a nice-to-have, not durable data
    }
  }

  function dismiss() {
    persistDismissed(new Set(dismissed).add(`${todayStr}-${due}`));
  }

  function logNow() {
    onSetStatus(todayStr, due!, "on_time");
    dismiss();
  }

  const meta = PRAYER_META[due];

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-2xl p-4 shadow-sm animate-app-in"
      style={{ background: "var(--s-primary-container)" }}
    >
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
        style={{ background: "var(--s-primary)" }}
      >
        <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--s-on-primary)" }}>
          {meta.icon}
        </span>
      </div>
      <p className="flex-1 text-sm font-semibold" style={{ color: "var(--s-on-primary-container)" }}>
        It's time for {PRAYER_LABELS[due]} — mark it once you've prayed.
      </p>
      <button
        className="flex-none rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95"
        style={{ background: "var(--s-on-primary-container)", color: "var(--s-primary-container)" }}
        onClick={logNow}
      >
        Prayed
      </button>
      <button
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ color: "var(--s-on-primary-container)" }}
        onClick={dismiss}
        aria-label="Dismiss reminder"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
