import { useState } from "react";
import { toDayString } from "../../lib/salah";
import { dailyReminder } from "../../lib/reminders";
import type { ReminderCategory } from "../../lib/reminders";
import type { AnsweredDua, Reflection } from "../../lib/journal";
import { SalahReflection } from "./SalahReflection";
import { SalahDuas } from "./SalahDuas";

const CATEGORY_CHIP: Record<ReminderCategory, { label: string; bg: string; fg: string }> = {
  quran: { label: "Quran", bg: "var(--s-primary-container)", fg: "var(--s-on-primary-container)" },
  hadith: { label: "Hadith", bg: "var(--s-secondary-container)", fg: "var(--s-on-secondary-container)" },
  quote: { label: "Quote", bg: "var(--s-tertiary-container)", fg: "var(--s-on-tertiary-container)" }
};

interface Props {
  reflections: Reflection[];
  onSaveReflection: (day: string, prompt: string, text: string) => Promise<void>;
  duas: AnsweredDua[];
  onAddDua: (text: string) => Promise<void>;
  onMarkDuaAnswered: (id: string) => Promise<void>;
}

export function SalahReminder({
  reflections,
  onSaveReflection,
  duas,
  onAddDua,
  onMarkDuaAnswered
}: Props) {
  const [copied, setCopied] = useState(false);
  const today = new Date();
  const reminder = dailyReminder(toDayString(today));
  const chip = CATEGORY_CHIP[reminder.category];

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(`"${reminder.text}" — ${reminder.source}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--s-on-surface-variant)" }}>
        {dateLabel}
      </p>

      <div
        className="relative flex min-h-[220px] w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl p-8 text-center shadow-sm"
        style={{ background: "var(--s-surface-container)" }}
      >
        <span
          className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest"
          style={{ background: chip.bg, color: chip.fg }}
        >
          {chip.label}
        </span>

        <div className="flex flex-col gap-4">
          <h1 className="font-headline text-2xl leading-relaxed" style={{ color: "var(--s-on-surface)" }}>
            {reminder.text}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--s-on-surface-variant)" }}>
            {reminder.source}
          </p>
        </div>

        <button
          className="absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-transform active:scale-90"
          style={{ background: "var(--s-surface-container-lowest)", color: "var(--s-on-surface-variant)" }}
          onClick={copy}
          aria-label="Copy reminder"
        >
          <span className="material-symbols-outlined text-[20px]">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>

      <SalahReflection reflections={reflections} onSave={onSaveReflection} />
      <SalahDuas duas={duas} onAdd={onAddDua} onMarkAnswered={onMarkDuaAnswered} />
    </section>
  );
}
