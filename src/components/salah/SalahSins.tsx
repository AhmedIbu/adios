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

function SeverityDot({ severity }: { severity: number }) {
  return (
    <span
      className="h-3 w-3 flex-none rounded-full"
      style={{ background: severityColor(severity) }}
    />
  );
}

function SeveritySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
          Severity
        </span>
        <span className="h-3 w-3 rounded-full" style={{ background: severityColor(value) }} />
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: severityColor(value) }}
      />
      <div className="mt-1 flex justify-between text-[10px] font-bold tracking-widest text-on-surface-dim/60 uppercase">
        <span>Mild</span>
        <span>Major</span>
      </div>
    </div>
  );
}

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

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState(3);

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

  async function addType() {
    if (!newName.trim()) return;
    try {
      const saved = await createSinType(newName.trim(), newSeverity);
      setTypes((ts) => [...ts, saved]);
      setNewName("");
      setNewSeverity(3);
      setAdding(false);
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
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
      <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <p className="text-center text-sm text-on-surface-dim">Loading…</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
        <p className="text-center text-sm text-error">{loadError}</p>
      </div>
    );
  }

  const typeById = new Map(types.map((t) => [t.id, t]));
  const recentLogs = logs.slice(0, 10);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <h3 className="mb-1 text-lg font-bold text-on-surface">Sins</h3>
      <p className="mb-4 text-xs text-on-surface-dim">
        A private log, just for you. Nothing here is shared or judged — tracking it is the point.
      </p>

      <div className="space-y-2">
        {types.map((t) => {
          const d = daysSince(logs, t.id, today);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-3.5"
            >
              <button className="flex flex-1 items-center gap-3 text-left" onClick={() => openLog(t)}>
                <SeverityDot severity={t.severity} />
                <div>
                  <p className="text-sm font-bold text-on-surface">{t.name}</p>
                  <p className="text-xs text-on-surface-dim">
                    {d === null ? "Not logged yet" : `${d} ${d === 1 ? "day" : "days"} since last`}
                  </p>
                </div>
              </button>
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-on-surface-dim/60 transition-colors hover:text-on-surface"
                onClick={() => openEdit(t)}
                aria-label={`Edit ${t.name}`}
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/8 bg-white/5 p-4">
          <input
            className="w-full rounded-xl border border-white/10 bg-surface-high px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-dim/50"
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <SeveritySlider value={newSeverity} onChange={setNewSeverity} />
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-full border border-white/10 py-2 text-sm font-bold text-on-surface-dim"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button
              className="flex-1 rounded-full bg-primary py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              onClick={addType}
              disabled={!newName.trim()}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 py-3 text-sm font-semibold text-on-surface-dim transition-colors hover:border-primary/40 hover:text-primary"
          onClick={() => setAdding(true)}
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add category
        </button>
      )}

      {logs.length > 0 && (
        <div className="mt-5">
          <button
            className="flex w-full items-center justify-between text-xs font-bold tracking-widest text-on-surface-dim uppercase"
            onClick={() => setShowHistory((v) => !v)}
          >
            <span>History ({logs.length})</span>
            <span className="material-symbols-outlined text-base">
              {showHistory ? "expand_less" : "expand_more"}
            </span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {recentLogs.map((l) => {
                const t = typeById.get(l.sin_type_id);
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      {t && <SeverityDot severity={t.severity} />}
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {t?.name ?? "Deleted category"}
                        </p>
                        <p className="text-xs text-on-surface-dim">
                          {new Date(l.occurred_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </p>
                        {l.note && <p className="mt-1 text-xs text-on-surface-dim">{l.note}</p>}
                      </div>
                    </div>
                    <button
                      className="flex h-7 w-7 flex-none items-center justify-center text-on-surface-dim/50 hover:text-error"
                      onClick={() => removeLog(l.id)}
                      aria-label="Delete entry"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                );
              })}
              {logs.length > recentLogs.length && (
                <p className="pt-1 text-center text-xs text-on-surface-dim">
                  +{logs.length - recentLogs.length} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log sheet */}
      {logSheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setLogSheet(null)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {!showDua ? (
              <div className="px-6 pt-2">
                <h3 className="mb-4 text-center text-base font-semibold text-on-surface">
                  Log "{logSheet.name}"
                </h3>
                <textarea
                  className="w-full resize-none rounded-xl border border-white/10 bg-surface-high p-3 text-sm text-on-surface placeholder:text-on-surface-dim/50"
                  rows={3}
                  placeholder="Optional note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-5 flex gap-3">
                  <button
                    className="flex-1 rounded-full border border-white/10 py-3 text-sm font-bold text-on-surface-dim"
                    onClick={() => setLogSheet(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-on-primary disabled:opacity-60"
                    onClick={confirmLog}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 pt-2 pb-2 text-center">
                <p className="mb-4 text-xs font-bold tracking-widest text-secondary uppercase">
                  Logged
                </p>
                <p dir="rtl" className="mb-2 text-right text-2xl leading-loose text-on-surface">
                  {FORGIVENESS_DUA.arabic}
                </p>
                <p className="text-sm italic text-on-surface-dim">
                  {FORGIVENESS_DUA.transliteration}
                </p>
                <p className="mt-2 text-sm text-on-surface">{FORGIVENESS_DUA.translation}</p>
                <button
                  className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-bold text-on-primary"
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
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-8 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <div className="space-y-4 px-6 pt-2">
              <input
                className="w-full rounded-xl border border-white/10 bg-surface-high px-3 py-2.5 text-sm text-on-surface"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <SeveritySlider value={editSeverity} onChange={setEditSeverity} />
              <button
                className="w-full rounded-full bg-primary py-3 text-sm font-bold text-on-primary disabled:opacity-60"
                onClick={saveEdit}
                disabled={!editName.trim()}
              >
                Save
              </button>
              <button
                className="w-full rounded-full border border-error/30 py-3 text-sm font-bold text-error"
                onClick={removeType}
              >
                Delete category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
