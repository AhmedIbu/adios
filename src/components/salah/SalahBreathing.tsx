import { useEffect, useState } from "react";

const PHASES = [
  { id: "inhale", label: "Breathe in", seconds: 4, scale: 1 },
  { id: "hold", label: "Hold", seconds: 7, scale: 1 },
  { id: "exhale", label: "Breathe out", seconds: 8, scale: 0.55 }
] as const;

interface Props {
  onClose: () => void;
}

export function SalahBreathing({ onClose }: Props) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const phase = PHASES[phaseIndex];

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhaseIndex((i) => {
        const next = (i + 1) % PHASES.length;
        if (next === 0) setCycle((c) => c + 1);
        return next;
      });
    }, phase.seconds * 1000);
    return () => window.clearTimeout(t);
  }, [phaseIndex, phase.seconds]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-bg/95 backdrop-blur-2xl">
      <button
        className="absolute right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-on-surface-dim transition-colors active:scale-90"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
        onClick={onClose}
        aria-label="Close breathing exercise"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="relative flex h-64 w-64 items-center justify-center">
        <div
          className="absolute rounded-full bg-primary/20"
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.seconds}s ease-in-out`
          }}
        />
        <div
          className="absolute rounded-full bg-primary/40"
          style={{
            width: "70%",
            height: "70%",
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.seconds}s ease-in-out`
          }}
        />
        <div className="relative z-10 text-center">
          <p className="text-2xl font-bold text-on-surface">{phase.label}</p>
          <p className="mt-1 text-xs font-bold tracking-widest text-on-surface-dim uppercase">
            {phase.seconds}s
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs font-bold tracking-widest text-on-surface-dim/60 uppercase">
        Cycle {cycle + 1}
      </p>
    </div>
  );
}
