interface Props {
  onSelect: (app: "adios" | "salah") => void;
}

export function AppPicker({ onSelect }: Props) {
  return (
    <div
      className="mesh-gradient flex min-h-dvh flex-col items-center justify-center gap-3 px-6"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)"
      }}
    >
      <p className="mb-3 text-[11px] font-extrabold tracking-[0.2em] text-on-surface-dim/70 uppercase">
        Which app?
      </p>

      <button
        className="group relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/8 bg-surface-glass p-6 text-left backdrop-blur-2xl transition-transform duration-200 active:scale-[0.97]"
        onClick={() => onSelect("adios")}
      >
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl transition-opacity group-active:opacity-60" />
        <span className="material-symbols-outlined is-filled mb-3 block text-4xl text-primary">
          library_music
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-on-surface">Adios</h2>
        <p className="mt-1 text-sm text-on-surface-dim">Your lecture library &amp; player</p>
      </button>

      <button
        className="group relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/8 bg-surface-glass p-6 text-left backdrop-blur-2xl transition-transform duration-200 active:scale-[0.97]"
        onClick={() => onSelect("salah")}
      >
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-secondary/20 blur-2xl transition-opacity group-active:opacity-60" />
        <span className="material-symbols-outlined mb-3 block text-4xl text-secondary">mosque</span>
        <h2 className="text-xl font-extrabold tracking-tight text-on-surface">Salah Tracker</h2>
        <p className="mt-1 text-sm text-on-surface-dim">Prayers, qada, streaks &amp; reminders</p>
      </button>

      <p className="mt-4 text-[10px] font-bold tracking-widest text-on-surface-dim/60 uppercase">
        Tap an app to continue
      </p>
    </div>
  );
}
