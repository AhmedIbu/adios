import { useState } from "react";

export interface OnboardingStep {
  icon: string;
  title: string;
  body: string;
}

interface Props {
  storageKey: string;
  steps: OnboardingStep[];
}

function seen(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return true; // fail closed — don't nag if storage is unavailable
  }
}

function markSeen(storageKey: string) {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    // ignore
  }
}

/**
 * One-time, dismissible feature tour shown the first time an app is opened.
 * Uses the base (non `--s-`) token classes — like Gate/Player, it relies on
 * the CSS remap that makes those resolve correctly inside `.salah-app` too,
 * so this same component works for both apps without a theme prop.
 */
export function OnboardingTour({ storageKey, steps }: Props) {
  const [dismissed, setDismissed] = useState(() => seen(storageKey));
  const [index, setIndex] = useState(0);

  if (dismissed) return null;

  function finish() {
    markSeen(storageKey);
    setDismissed(true);
  }

  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl bg-surface-container-lowest p-8 text-center shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container">
          <span className="material-symbols-outlined is-filled text-[32px] text-on-primary-container">
            {step.icon}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-headline text-xl text-on-surface">{step.title}</h2>
          <p className="text-sm leading-relaxed text-on-surface-variant">{step.body}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary" : "w-1.5 bg-on-surface-variant/40"
              }`}
            />
          ))}
        </div>

        <div className="mt-1 flex w-full items-center justify-between">
          <button className="text-sm font-medium text-on-surface-variant" onClick={finish}>
            Skip
          </button>
          <button
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition-transform active:scale-95"
            onClick={() => (last ? finish() : setIndex((i) => i + 1))}
          >
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
