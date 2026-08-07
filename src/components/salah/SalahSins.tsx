import { useEffect, useMemo, useState } from "react";
import type { SinLog, SinType } from "../../lib/sins";
import {
  createSinType,
  daysSince,
  deleteSinLog,
  deleteSinType,
  listSinLogs,
  logSin,
  seedDefaultSinTypesIfEmpty,
  severityColor,
  updateSinType
} from "../../lib/sins";
import { DUAS } from "../../lib/content/duas";
import { allQuotes } from "../../lib/reminders";
import { toDayString } from "../../lib/salah";

const FORGIVENESS_DUA = DUAS.find((d) => d.id === "forgiveness")!;
const SEVERITY_LABELS = ["Minor", "Light", "Moderate", "Serious", "Major"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function randomQuote() {
  const quotes = allQuotes();
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function SalahSins() {
  const [types, setTypes] = useState<SinType[]>([]);
  const [logs, setLogs] = useState<SinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [logSheet, setLogSheet] = useState<SinType | null>(null);
  const [note, setNote] = useState("");
  const [reflection, setReflection] = useState<{ quote: ReturnType<typeof randomQuote> } | null>(null);
  const [saving, setSaving] = useState(false);

  const [editSheet, setEditSheet] = useState<SinType | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeverity, setEditSeverity] = useState(3);

  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState(1);

  const [showCategories, setShowCategories] = useState(false);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([seedDefaultSinTypesIfEmpty(), listSinLogs()])
      .then(([t, l]) => {
        setTypes(t);
        setLogs(l);
        setLoadError(null);
      })
      .catch((e) => {
        console.error(e);
        setLoadError(
          "Couldn't load — if this is the first run, make sure supabase/salah-tracker.sql has been applied."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const today = useMemo(() => new Date(), []);
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  // Day -> logs, for both the calendar heatmap and the day-detail panel.
  const byDay = useMemo(() => {
    const map = new Map<string, SinLog[]>();
    for (const l of logs) {
      const day = toDayString(new Date(l.occurred_at));
      map.set(day, [...(map.get(day) ?? []), l]);
    }
    return map;
  }, [logs]);

  // "Frequent" = the 4 categories logged most often, falling back to newest categories.
  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) counts.set(l.sin_type_id, (counts.get(l.sin_type_id) ?? 0) + 1);
    return [...types]
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
      .slice(0, 4);
  }, [types, logs]);

  async function quickLog(t: SinType) {
    try {
      const saved = await logSin(t.id, "");
      setLogs((ls) => [saved, ...ls]);
      setReflection({ quote: randomQuote() });
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    }
  }

  function openLog(t: SinType) {
    setNote("");
    setLogSheet(t);
  }

  async function confirmLog() {
    if (!logSheet) return;
    setSaving(true);
    try {
      const saved = await logSin(logSheet.id, note.trim());
      setLogs((ls) => [saved, ...ls]);
      setLogSheet(null);
      setReflection({ quote: randomQuote() });
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function addAndLog() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const type = await createSinType(newName.trim(), newSeverity);
      setTypes((ts) => [...ts, type]);
      const saved = await logSin(type.id, "");
      setLogs((ls) => [saved, ...ls]);
      setNewName("");
      setNewSeverity(1);
      setReflection({ quote: randomQuote() });
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(t: SinType) {
    setEditName(t.name);
    setEditSeverity(t.severity);
    setEditSheet(t);
  }

  async function saveEdit() {
    if (!editSheet || !editName.trim()) return;
    try {
      const saved = await updateSinType(editSheet.id, {
        name: editName.trim(),
        severity: editSeverity
      });
      setTypes((ts) => ts.map((t) => (t.id === saved.id ? saved : t)));
      setEditSheet(null);
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    }
  }

  async function removeType() {
    if (!editSheet) return;
    if (!confirm(`Delete "${editSheet.name}" and all its logged entries? This can't be undone.`))
      return;
    try {
      await deleteSinType(editSheet.id);
      setTypes((ts) => ts.filter((t) => t.id !== editSheet.id));
      setLogs((ls) => ls.filter((l) => l.sin_type_id !== editSheet.id));
      setEditSheet(null);
    } catch (e) {
      console.error(e);
      alert("Couldn't delete — check your connection.");
    }
  }

  async function removeLog(id: string) {
    setLogs((ls) => ls.filter((l) => l.id !== id));
    try {
      await deleteSinLog(id);
    } catch (e) {
      console.error(e);
      alert("Couldn't delete — check your connection.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <p className="text-center text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
          Loading…
        </p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <p className="text-center text-sm" style={{ color: "var(--s-error)" }}>
          {loadError}
        </p>
      </div>
    );
  }

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay();
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayStr = toDayString(new Date());
  const selectedLogs = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  function avgSeverity(dayLogs: SinLog[]): number {
    const sevs = dayLogs.map((l) => typeById.get(l.sin_type_id)?.severity ?? 3);
    return sevs.reduce((a, b) => a + b, 0) / sevs.length;
  }

  return (
    <section className="flex flex-col gap-8 pb-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <div
          className="mb-1 flex h-16 w-16 items-center justify-center rounded-full shadow-md"
          style={{ background: "var(--s-surface-container-high)" }}
        >
          <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--s-tertiary-fixed-dim, var(--s-tertiary))" }}>
            heart_broken
          </span>
        </div>
        <h2 className="font-headline text-2xl" style={{ color: "var(--s-on-surface)" }}>
          Self-Reflection
        </h2>
        <p className="mx-auto max-w-[280px] text-sm leading-relaxed" style={{ color: "var(--s-on-surface-variant)" }}>
          Acknowledge shortcomings privately to clear your heart and seek continuous betterment.
        </p>
      </div>

      {/* Record an Action */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 shadow-sm" style={{ background: "var(--s-surface-container)" }}>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
          style={{ background: "color-mix(in srgb, var(--s-primary-container) 5%, transparent)" }}
        />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--s-tertiary-fixed-dim, var(--s-tertiary))" }}>
            edit_note
          </span>
          <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
            Record an Action
          </h3>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
            Description (Private)
          </label>
          <input
            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
            style={{ background: "var(--s-surface-container-low)", color: "var(--s-on-surface)" }}
            placeholder="What happened today?"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
              Perceived Severity
            </label>
            <span
              className="rounded-md px-2 py-1 text-[11px] font-medium"
              style={{ background: "var(--s-surface-container-high)", color: severityColor(newSeverity) }}
            >
              Level {newSeverity}
            </span>
          </div>
          <div className="relative flex h-8 w-full items-center">
            <div className="absolute h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--s-surface-container-highest)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((newSeverity - 1) / 4) * 100}%`,
                  background: `linear-gradient(to right, ${severityColor(1)}, ${severityColor(newSeverity)})`
                }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={newSeverity}
              onChange={(e) => setNewSeverity(Number(e.target.value))}
              className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none absolute flex w-full justify-between px-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <div key={v} className="h-2 w-2 rounded-full" style={{ background: "var(--s-surface)" }} />
              ))}
            </div>
          </div>
          <div className="mt-1 flex w-full justify-between text-[10px]" style={{ color: "var(--s-on-surface-variant)" }}>
            <span>Minor</span>
            <span>Major</span>
          </div>
        </div>
        <button
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-4 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--s-primary-container)", color: "var(--s-on-primary-container)" }}
          onClick={addAndLog}
          disabled={!newName.trim() || saving}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Log Reflection
        </button>
      </div>

      {/* Frequent Areas */}
      {frequent.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--s-tertiary-fixed-dim, var(--s-tertiary))" }}>
              bolt
            </span>
            <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
              Frequent Areas
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {frequent.map((t) => (
              <button
                key={t.id}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium shadow-sm transition-colors"
                style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface-variant)" }}
                onClick={() => quickLog(t)}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: severityColor(t.severity) }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            {monthLabel}
          </h3>
          <div className="flex gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface-variant)" }}
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
              style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface-variant)" }}
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3 grid grid-cols-7 gap-y-2 gap-x-1 text-center">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-[11px] font-medium" style={{ color: "var(--s-on-surface-variant)" }}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = toDayString(new Date(month.getFullYear(), month.getMonth(), day));
              const dayLogs = byDay.get(dayStr) ?? [];
              const selected = selectedDay === dayStr;
              const isToday = dayStr === todayStr;

              let bg = "transparent";
              let color = "var(--s-on-surface)";
              if (dayLogs.length > 0) {
                const sev = avgSeverity(dayLogs);
                bg = `color-mix(in srgb, ${severityColor(sev)} ${Math.min(70, 25 + dayLogs.length * 15)}%, var(--s-surface-container))`;
                color = "#fff";
              }
              if (selected) {
                bg = "var(--s-primary)";
                color = "var(--s-on-primary)";
              }

              return (
                <button
                  key={dayStr}
                  className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all active:scale-95"
                  style={{
                    background: bg,
                    color,
                    outline: isToday && !selected ? "2px solid var(--s-primary)" : undefined,
                    outlineOffset: isToday && !selected ? "1px" : undefined
                  }}
                  onClick={() => setSelectedDay(selected ? null : dayStr)}
                  aria-label={`${dayStr}: ${dayLogs.length} logged`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--s-surface-container-low)" }}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric"
                })}
              </h4>
              <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                {selectedLogs.length} logged
              </span>
            </div>
            {selectedLogs.length === 0 && (
              <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
                Nothing logged this day, alhamdulillah.
              </p>
            )}
            {selectedLogs.map((l) => {
              const t = typeById.get(l.sin_type_id);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl p-3 shadow-sm"
                  style={{ background: "var(--s-surface-container-lowest)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: t ? severityColor(t.severity) : "var(--s-outline-variant)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--s-on-surface)" }}>
                        {t?.name ?? "Deleted category"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                        {new Date(l.occurred_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <button
                    className="rounded-full p-2"
                    style={{ color: "var(--s-primary)" }}
                    onClick={() => removeLog(l.id)}
                    aria-label="Undo entry"
                  >
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Categories management */}
      <div className="flex flex-col gap-2">
        <button
          className="flex w-full items-center justify-between text-[12px] font-bold uppercase tracking-widest"
          style={{ color: "var(--s-on-surface-variant)" }}
          onClick={() => setShowCategories((v) => !v)}
        >
          <span>Categories ({types.length})</span>
          <span className="material-symbols-outlined text-base">
            {showCategories ? "expand_less" : "expand_more"}
          </span>
        </button>
        {showCategories && (
          <div className="flex flex-col gap-2">
            {types.map((t) => {
              const d = daysSince(logs, t.id, today);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl p-3.5 shadow-sm"
                  style={{ background: "var(--s-surface-container)" }}
                >
                  <button className="flex flex-1 items-center gap-3 text-left" onClick={() => openLog(t)}>
                    <span className="h-3 w-3 flex-none rounded-full" style={{ background: severityColor(t.severity) }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                        {t.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                        {d === null ? "Not logged yet" : `${d} ${d === 1 ? "day" : "days"} since last`}
                      </p>
                    </div>
                  </button>
                  <button
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors"
                    style={{ color: "var(--s-on-surface-variant)" }}
                    onClick={() => openEdit(t)}
                    aria-label={`Edit ${t.name}`}
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log with note sheet */}
      {logSheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setLogSheet(null)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", background: "var(--s-surface-container-lowest)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: "var(--s-outline-variant)" }} />
            </div>
            <div className="px-6 pt-2">
              <h3 className="mb-4 text-center text-base font-semibold" style={{ color: "var(--s-on-surface)" }}>
                Log "{logSheet.name}"
              </h3>
              <textarea
                className="w-full resize-none rounded-xl p-3 text-sm focus:outline-none"
                style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface)" }}
                rows={3}
                placeholder="Optional note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-5 flex gap-3">
                <button
                  className="flex-1 rounded-full py-3 text-sm font-bold"
                  style={{ border: "1px solid var(--s-outline-variant)", color: "var(--s-on-surface-variant)" }}
                  onClick={() => setLogSheet(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-full py-3 text-sm font-bold disabled:opacity-60"
                  style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
                  onClick={confirmLog}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reflection popup — a dua and a quote, shown after any sin is logged. */}
      {reflection && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setReflection(null)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", background: "var(--s-surface-container-lowest)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: "var(--s-outline-variant)" }} />
            </div>
            <div className="px-6 pt-2 pb-2 text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--s-secondary)" }}>
                Logged — take a moment
              </p>
              <p dir="rtl" className="mb-2 text-right text-2xl leading-loose" style={{ color: "var(--s-on-surface)" }}>
                {FORGIVENESS_DUA.arabic}
              </p>
              <p className="text-sm italic" style={{ color: "var(--s-on-surface-variant)" }}>
                {FORGIVENESS_DUA.transliteration}
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--s-on-surface)" }}>
                {FORGIVENESS_DUA.translation}
              </p>
              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--s-outline-variant)" }}>
                <p className="text-sm italic leading-relaxed" style={{ color: "var(--s-on-surface)" }}>
                  "{reflection.quote.text}"
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                  — {reflection.quote.source}
                </p>
              </div>
              <button
                className="mt-6 w-full rounded-full py-3 text-sm font-bold"
                style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
                onClick={() => setReflection(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit sheet */}
      {editSheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setEditSheet(null)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", background: "var(--s-surface-container-lowest)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: "var(--s-outline-variant)" }} />
            </div>
            <div className="flex flex-col gap-4 px-6 pt-2">
              <input
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "var(--s-surface-container)", color: "var(--s-on-surface)" }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <label className="flex justify-between text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
                  <span>Severity</span>
                  <span style={{ color: severityColor(editSeverity) }}>{SEVERITY_LABELS[editSeverity - 1]}</span>
                </label>
                <div className="flex items-center gap-1 rounded-lg p-2" style={{ background: "var(--s-surface-container)" }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
                      style={
                        editSeverity === v
                          ? { background: severityColor(v), color: "#fff" }
                          : { color: "var(--s-on-surface-variant)" }
                      }
                      onClick={() => setEditSeverity(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="w-full rounded-full py-3 text-sm font-bold disabled:opacity-60"
                style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
                onClick={saveEdit}
                disabled={!editName.trim()}
              >
                Save
              </button>
              <button
                className="w-full rounded-full py-3 text-sm font-bold"
                style={{ border: "1px solid color-mix(in srgb, var(--s-error) 30%, transparent)", color: "var(--s-error)" }}
                onClick={removeType}
              >
                Delete category
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
