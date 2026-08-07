import { useState } from "react";
import type { AnsweredDua, Reflection } from "../../lib/journal";
import { SalahDuaLibrary } from "./SalahDuaLibrary";
import { SalahDuaQuiz } from "./SalahDuaQuiz";
import { SalahSurahOfMonth } from "./SalahSurahOfMonth";
import { SalahReminder } from "./SalahReminder";

interface Props {
  reflections: Reflection[];
  onSaveReflection: (day: string, prompt: string, text: string) => Promise<void>;
  duas: AnsweredDua[];
  onAddDua: (text: string) => Promise<void>;
  onMarkDuaAnswered: (id: string) => Promise<void>;
}

type Mode = "explore" | "saved";
type Sheet = "duas" | "quiz" | "surah" | null;

function LearnSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

export function SalahLearn(props: Props) {
  const [mode, setMode] = useState<Mode>("explore");
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <section>
      <div className="mb-6 flex items-center">
        <div className="flex items-center gap-2 rounded-full p-1" style={{ background: "var(--s-surface-container)" }}>
          {(["explore", "saved"] as const).map((m) => (
            <button
              key={m}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={
                mode === m
                  ? { background: "var(--s-primary)", color: "var(--s-on-primary)" }
                  : { color: "var(--s-on-surface-variant)" }
              }
              onClick={() => setMode(m)}
            >
              {m === "explore" ? "Explore" : "Saved"}
            </button>
          ))}
        </div>
      </div>

      {mode === "saved" ? (
        <SalahReminder {...props} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Learning */}
          <div className="flex flex-col gap-4">
            <h2 className="px-1 font-headline text-xl" style={{ color: "var(--s-on-surface)" }}>
              Learning
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="col-span-2 flex items-center justify-between rounded-xl p-5 text-left transition-colors"
                style={{ background: "var(--s-surface-container)" }}
                onClick={() => setSheet("duas")}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--s-primary) 12%, transparent)" }}
                  >
                    <span className="material-symbols-outlined is-filled" style={{ color: "var(--s-primary)" }}>
                      menu_book
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--s-on-surface)" }}>
                      Dua Library
                    </h3>
                    <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
                      Supplications for every moment
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ color: "var(--s-on-surface-variant)" }}>
                  chevron_right
                </span>
              </button>

              <button
                className="col-span-1 flex min-h-[120px] flex-col justify-between rounded-xl p-4 text-left transition-colors"
                style={{ background: "var(--s-surface-container-low)" }}
                onClick={() => setSheet("quiz")}
              >
                <span className="material-symbols-outlined text-3xl" style={{ color: "var(--s-secondary)" }}>
                  quiz
                </span>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--s-on-surface)" }}>
                    Islamic Quiz
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
                    Test your knowledge
                  </p>
                </div>
              </button>

              <button
                className="group relative col-span-1 flex min-h-[120px] flex-col justify-between overflow-hidden rounded-xl p-4 text-left transition-colors"
                style={{ background: "var(--s-primary-container)" }}
                onClick={() => setSheet("surah")}
              >
                <span
                  className="material-symbols-outlined is-filled pointer-events-none absolute -bottom-4 -right-4 rotate-12 text-[80px] opacity-10 transition-transform duration-700 group-hover:rotate-6"
                  style={{ color: "var(--s-on-primary-container)" }}
                >
                  auto_stories
                </span>
                <span
                  className="material-symbols-outlined is-filled relative z-10 text-3xl"
                  style={{ color: "var(--s-on-primary-container)" }}
                >
                  auto_stories
                </span>
                <div className="relative z-10 mt-4">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--s-on-primary-container)" }}>
                    Surah of the Month
                  </h3>
                  <p className="mt-1 text-xs opacity-80" style={{ color: "var(--s-on-primary-container)" }}>
                    Read this month's pick
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {sheet === "duas" && (
        <LearnSheet title="Dua Library" onClose={() => setSheet(null)}>
          <SalahDuaLibrary />
        </LearnSheet>
      )}
      {sheet === "quiz" && (
        <LearnSheet title="Islamic Quiz" onClose={() => setSheet(null)}>
          <SalahDuaQuiz />
        </LearnSheet>
      )}
      {sheet === "surah" && (
        <LearnSheet title="Surah of the Month" onClose={() => setSheet(null)}>
          <SalahSurahOfMonth />
        </LearnSheet>
      )}
    </section>
  );
}
