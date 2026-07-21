import { useState } from "react";
import { toDayString } from "../../lib/salah";
import { dailyReminder } from "../../lib/reminders";
import type { ReminderCategory } from "../../lib/reminders";

const CATEGORY_CHIP: Record<ReminderCategory, { label: string; cls: string }> = {
  quran: { label: "Quran", cls: "bg-primary-container text-on-primary-container" },
  hadith: { label: "Hadith", cls: "bg-secondary-container text-on-secondary-container" },
  quote: { label: "Quote", cls: "bg-tertiary-container text-on-tertiary-container" }
};

export function SalahReminder() {
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
    <section className="flex min-h-[60vh] flex-col items-center justify-center">
      <p className="mb-8 text-[11px] font-extrabold tracking-[0.2em] text-on-surface-dim/70 uppercase">
        {dateLabel}
      </p>

      <div className="relative w-full max-w-md">
        {/* Soft glow behind the card, tinted by category */}
        <div
          className={`absolute inset-0 -z-10 scale-110 rounded-full opacity-20 blur-3xl ${
            reminder.category === "quran"
              ? "bg-primary"
              : reminder.category === "hadith"
                ? "bg-secondary"
                : "bg-tertiary"
          }`}
        />
        <div className="animate-app-in relative flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-surface-glass p-10 text-center shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-8 left-0 flex w-full justify-center">
            <span
              className={`rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase shadow-sm ${chip.cls}`}
            >
              {chip.label}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-6">
            <h1 className="text-2xl leading-relaxed font-light tracking-tight text-on-surface">
              {reminder.text}
            </h1>
            <p className="text-[10px] font-bold tracking-[0.15em] text-on-surface-dim/70 uppercase">
              {reminder.source}
            </p>
          </div>

          <button
            className="absolute right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-on-surface-dim shadow-lg transition-all duration-300 hover:text-primary active:scale-90"
            onClick={copy}
            aria-label="Copy reminder"
          >
            <span className="material-symbols-outlined">
              {copied ? "check" : "content_copy"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-2 opacity-30">
        <span className="material-symbols-outlined text-sm">auto_awesome</span>
        <span className="text-[11px] font-extrabold tracking-widest uppercase">
          Reflection of the day
        </span>
      </div>
    </section>
  );
}
