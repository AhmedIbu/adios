import { useEffect, useState } from "react";
import type { Reflection } from "../../lib/journal";
import { toDayString } from "../../lib/salah";
import { dailyPrompt } from "../../lib/reminders";

interface Props {
  reflections: Reflection[];
  onSave: (day: string, prompt: string, text: string) => Promise<void>;
}

export function SalahReflection({ reflections, onSave }: Props) {
  const todayStr = toDayString(new Date());
  const prompt = dailyPrompt(todayStr);
  const existing = reflections.find((r) => r.day === todayStr);

  const [text, setText] = useState(existing?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(existing?.text ?? "");
  }, [existing?.text]);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave(todayStr, prompt, text.trim());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-secondary uppercase">
        Reflection
      </p>
      <h3 className="mb-3 text-base font-bold text-on-surface">{prompt}</h3>
      <textarea
        className="w-full resize-none rounded-xl border border-white/10 bg-surface-high p-3 text-sm text-on-surface placeholder:text-on-surface-dim/50"
        rows={4}
        placeholder="Write a few lines…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="mt-3 w-full rounded-full bg-secondary py-2.5 text-sm font-bold text-on-secondary disabled:opacity-50"
        onClick={handleSave}
        disabled={saving || !text.trim()}
      >
        {saving ? "Saving…" : saved ? "Saved" : existing ? "Update" : "Save"}
      </button>
    </div>
  );
}
