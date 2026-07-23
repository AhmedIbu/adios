import { useState } from "react";
import type { AnsweredDua, Reflection } from "../../lib/journal";
import { SalahReminder } from "./SalahReminder";
import { SalahQuoteCarousel } from "./SalahQuoteCarousel";
import { SalahHadith } from "./SalahHadith";
import { SalahDuaLibrary } from "./SalahDuaLibrary";
import { SalahDuaQuiz } from "./SalahDuaQuiz";
import { SalahSurahOfMonth } from "./SalahSurahOfMonth";

interface Props {
  reflections: Reflection[];
  onSaveReflection: (day: string, prompt: string, text: string) => Promise<void>;
  duas: AnsweredDua[];
  onAddDua: (text: string) => Promise<void>;
  onMarkDuaAnswered: (id: string) => Promise<void>;
}

type Mode = "daily" | "explore";

export function SalahLearn(props: Props) {
  const [mode, setMode] = useState<Mode>("daily");

  return (
    <section>
      <div className="mb-5 flex items-center justify-center">
        <div className="flex items-center rounded-full bg-surface-high p-1">
          {(["daily", "explore"] as const).map((m) => (
            <button
              key={m}
              className={`rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-widest uppercase transition-colors ${
                mode === m ? "bg-primary text-on-primary" : "text-on-surface-dim"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "daily" ? "Daily" : "Explore"}
            </button>
          ))}
        </div>
      </div>

      {mode === "daily" ? (
        <SalahReminder {...props} />
      ) : (
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <SalahQuoteCarousel />
          <SalahHadith />
          <SalahDuaLibrary />
          <SalahDuaQuiz />
          <SalahSurahOfMonth />
        </div>
      )}
    </section>
  );
}
