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

        {/* Tools row */}
        <div className="mt-2 mb-8">
          <h3 className="mb-4 ml-1 text-[12px] font-bold uppercase tracking-widest text-on-surface-dim">
            More tools
          </h3>
          <div className="flex justify-between gap-4 rounded-xl border border-white/10 bg-surface-glass p-4">
            <button
              className="group flex flex-1 flex-col items-center gap-2"
              onClick={() => setSettingsOpen(true)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <span className="material-symbols-outlined">
                  {hasLocation(settings) ? "tune" : "add_location_alt"}
                </span>
              </div>
              <span className="text-center text-[11px] font-medium text-on-surface">
                Prayer settings
              </span>
            </button>
          </div>
        </div>
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
