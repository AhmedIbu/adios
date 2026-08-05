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

const FORGIVENESS_DUA = DUAS.find((d) => d.id === "forgiveness")!;
const SEVERITY_LABELS = ["Minor", "Light", "Moderate", "Serious", "Major"];

export function SalahSins() {
  const [types, setTypes] = useState<SinType[]>([]);
  const [logs, setLogs] = useState<SinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [logSheet, setLogSheet] = useState<SinType | null>(null);
  const [note, setNote] = useState("");
  const [showDua, setShowDua] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editSheet, setEditSheet] = useState<SinType | null>(null);
  const [editName, setEditName] = useState("");
  const [editSeverity, setEditSeverity] = useState(3);

  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState(1);
  const [adding, setAdding] = useState(false);

  const [showCategories, setShowCategories] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    }
  }

  function openLog(t: SinType) {
    setNote("");
    setShowDua(false);
    setLogSheet(t);
  }

  async function confirmLog() {
    if (!logSheet) return;
    setSaving(true);
    try {
      const saved = await logSin(logSheet.id, note.trim());
      setLogs((ls) => [saved, ...ls]);
      setShowDua(true);
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

  const recentLogs = logs.slice(0, 10);

  return (
    <section className="flex flex-col gap-6 pb-6">
      {/* Intro */}
      <div className="flex flex-col gap-2">
        <h2 className="font-headline text-2xl" style={{ color: "var(--s-primary)" }}>
          Self-Reflection
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--s-on-surface-variant)" }}>
          A safe space to acknowledge shortcomings and seek continuous improvement. This log is
          for your eyes only — a tool for awareness, not judgment.
        </p>
      </div>

      {/* Add a Sin */}
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5" style={{ background: "var(--s-surface-container-low)" }}>
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full blur-2xl"
          style={{ background: "color-mix(in srgb, var(--s-primary) 5%, transparent)" }}
        />
        <h3 className="mb-1 text-[13px] font-bold" style={{ color: "var(--s-primary)" }}>
          Record an Action
        </h3>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
            Description
          </label>
          <input
            className="w-full rounded-lg p-3 text-sm focus:outline-none"
            style={{ background: "var(--s-surface-container-lowest)", color: "var(--s-on-surface)" }}
            placeholder="What happened?"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex justify-between text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--s-on-surface-variant)" }}>
            <span>Severity</span>
            <span style={{ color: severityColor(newSeverity) }}>{SEVERITY_LABELS[newSeverity - 1]}</span>
          </label>
          <div className="flex items-center gap-1 rounded-lg p-2" style={{ background: "var(--s-surface-container-lowest)" }}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
                style={
                  newSeverity === v
                    ? { background: severityColor(v), color: "#fff" }
                    : { color: "var(--s-on-surface-variant)" }
                }
                onClick={() => setNewSeverity(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-4 text-sm font-bold transition-colors active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
          onClick={addAndLog}
          disabled={!newName.trim() || saving}
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Add to Log
        </button>
      </div>

      {/* Frequent Areas */}
      {frequent.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="font-headline text-xl" style={{ color: "var(--s-primary)" }}>
              Frequent Areas
            </h3>
            <p className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
              Tap to quickly log a recurring struggle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {frequent.map((t) => (
              <button
                key={t.id}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={{ background: "var(--s-surface-container-high)", color: "var(--s-on-surface)" }}
                onClick={() => quickLog(t)}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: severityColor(t.severity) }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Accountability Log */}
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-primary)" }}>
            Accountability Log
          </h3>
          {logs.length > 0 && (
            <span className="text-[11px]" style={{ color: "var(--s-on-surface-variant)" }}>
              {logs.length} entries
            </span>
          )}
        </div>
        {recentLogs.length === 0 && (
          <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
            Nothing logged yet.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {recentLogs.map((l) => {
            const t = typeById.get(l.sin_type_id);
            return (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl p-4 shadow-sm"
                style={{ background: "var(--s-surface-container-lowest)" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: t ? `color-mix(in srgb, ${severityColor(t.severity)} 20%, transparent)` : "var(--s-surface-container-highest)",
                      color: t ? severityColor(t.severity) : "var(--s-on-surface-variant)"
                    }}
                  >
                    {t?.severity ?? "–"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: "var(--s-on-surface)" }}>
                      {t?.name ?? "Deleted category"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                      {new Date(l.occurred_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </span>
                    {l.note && (
                      <span className="mt-0.5 text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                        {l.note}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="rounded-full p-2 transition-colors"
                  style={{ color: "var(--s-primary)" }}
                  onClick={() => removeLog(l.id)}
                  aria-label="Undo entry"
                >
                  <span className="material-symbols-outlined text-[20px]">undo</span>
                </button>
              </div>
            );
          })}
          {logs.length > recentLogs.length && (
            <button
              className="pt-1 text-center text-xs"
              style={{ color: "var(--s-on-surface-variant)" }}
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "Show fewer" : `+${logs.length - recentLogs.length} more`}
            </button>
          )}
        </div>
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

            {!showDua ? (
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
            ) : (
              <div className="px-6 pt-2 pb-2 text-center">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--s-secondary)" }}>
                  Logged
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
                <button
                  className="mt-6 w-full rounded-full py-3 text-sm font-bold"
                  style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
                  onClick={() => setLogSheet(null)}
                >
                  Done
                </button>
              </div>
            )}
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
