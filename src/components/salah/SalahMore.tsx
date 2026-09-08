import { useState } from "react";
import type { AnsweredDua, Reflection } from "../../lib/journal";
import type { SalahSettingsRow } from "../../lib/salah";
import { hasLocation } from "../../lib/prayertimes";
import { supabase } from "../../lib/supabase";
import { SalahLearn } from "./SalahLearn";
import { SalahHijriCalendar } from "./SalahHijriCalendar";
import { SalahIslamicEvents } from "./SalahIslamicEvents";
import { SalahZakahCalculator } from "./SalahZakahCalculator";
import { SalahPrayerTimeSettings } from "./SalahPrayerTimeSettings";
import { SalahQiblaCompass } from "./SalahQiblaCompass";

interface Props {
  reflections: Reflection[];
  onSaveReflection: (day: string, prompt: string, text: string) => Promise<void>;
  duas: AnsweredDua[];
  onAddDua: (text: string) => Promise<void>;
  onMarkDuaAnswered: (id: string) => Promise<void>;
  onDeleteDua: (id: string) => Promise<void>;
  settings: SalahSettingsRow | null;
  onSaveSettings: (settings: SalahSettingsRow) => Promise<void>;
}

type Tool = "hijri" | "zakah" | "qibla" | "settings" | null;

function ToolSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-xl flex-col rounded-t-3xl shadow-2xl"
        style={{
          background: "var(--s-surface-container-lowest)",
          maxHeight: "85dvh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
            {title}
          </h3>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: "var(--s-on-surface-variant)" }}
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function SalahMore({ settings, onSaveSettings, ...learnProps }: Props) {
  const [tool, setTool] = useState<Tool>(null);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-8">
      <SalahLearn {...learnProps} />

      <div className="flex flex-col gap-4">
        <SalahIslamicEvents />

        <h2 className="px-1 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
          Tools
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-4 transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)" }}
            onClick={() => setTool("hijri")}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              calendar_month
            </span>
            <span className="text-center text-xs font-medium" style={{ color: "var(--s-on-surface)" }}>
              Hijri Cal
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-4 transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)" }}
            onClick={() => setTool("zakah")}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              volunteer_activism
            </span>
            <span className="text-center text-xs font-medium" style={{ color: "var(--s-on-surface)" }}>
              Zakah
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-4 transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)" }}
            onClick={() => setTool("qibla")}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              explore
            </span>
            <span className="text-center text-xs font-medium" style={{ color: "var(--s-on-surface)" }}>
              Qibla
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-4 transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)" }}
            onClick={() => setTool("settings")}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              {hasLocation(settings) ? "tune" : "settings"}
            </span>
            <span className="text-center text-xs font-medium" style={{ color: "var(--s-on-surface)" }}>
              Settings
            </span>
          </button>
          <button
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-4 transition-transform active:scale-95"
            style={{ background: "var(--s-surface-container)" }}
            onClick={() => {
              if (confirm("Sign out of this device?")) supabase.auth.signOut();
            }}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              logout
            </span>
            <span className="text-center text-xs font-medium" style={{ color: "var(--s-on-surface)" }}>
              Sign out
            </span>
          </button>
        </div>
      </div>

      {tool === "hijri" && (
        <ToolSheet title="Hijri Calendar" onClose={() => setTool(null)}>
          <SalahHijriCalendar />
        </ToolSheet>
      )}
      {tool === "zakah" && (
        <ToolSheet title="Zakah Calculator" onClose={() => setTool(null)}>
          <SalahZakahCalculator />
        </ToolSheet>
      )}
      {tool === "qibla" && (
        <ToolSheet title="Qibla Direction" onClose={() => setTool(null)}>
          <SalahQiblaCompass settings={settings} />
        </ToolSheet>
      )}
      {tool === "settings" && (
        <SalahPrayerTimeSettings
          settings={settings}
          onSave={onSaveSettings}
          onClose={() => setTool(null)}
        />
      )}
    </section>
  );
}
