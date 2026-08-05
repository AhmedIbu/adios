import { useState } from "react";
import type { AnsweredDua, Reflection } from "../../lib/journal";
import type { SalahSettingsRow } from "../../lib/salah";
import { hasLocation } from "../../lib/prayertimes";
import { SalahLearn } from "./SalahLearn";
import { SalahHijriCalendar } from "./SalahHijriCalendar";
import { SalahIslamicEvents } from "./SalahIslamicEvents";
import { SalahZakahCalculator } from "./SalahZakahCalculator";
import { SalahPrayerTimeSettings } from "./SalahPrayerTimeSettings";

interface Props {
  reflections: Reflection[];
  onSaveReflection: (day: string, prompt: string, text: string) => Promise<void>;
  duas: AnsweredDua[];
  onAddDua: (text: string) => Promise<void>;
  onMarkDuaAnswered: (id: string) => Promise<void>;
  settings: SalahSettingsRow | null;
  onSaveSettings: (settings: SalahSettingsRow) => Promise<void>;
}

export function SalahMore({ settings, onSaveSettings, ...learnProps }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-8">
      <SalahLearn {...learnProps} />
      <div className="flex flex-col gap-5">
        <SalahHijriCalendar />
        <SalahIslamicEvents />
        <SalahZakahCalculator />
        <button
          className="flex items-center gap-3.5 rounded-2xl border border-white/8 bg-surface-glass p-4 text-left backdrop-blur-md transition-colors hover:bg-white/5"
          onClick={() => setSettingsOpen(true)}
        >
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/10 bg-primary/10 text-primary">
            <span className="material-symbols-outlined is-filled">
              {hasLocation(settings) ? "tune" : "add_location_alt"}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-on-surface">Prayer time settings</h4>
            <p className="text-xs text-on-surface-dim">
              {hasLocation(settings) ? "Location & calculation method" : "Set up your location"}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-dim/40">chevron_right</span>
        </button>
      </div>

      {settingsOpen && (
        <SalahPrayerTimeSettings
          settings={settings}
          onSave={onSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </section>
  );
}
