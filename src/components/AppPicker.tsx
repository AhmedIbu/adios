interface Props {
  onSelect: (app: "adios" | "salah") => void;
}

export function AppPicker({ onSelect }: Props) {
  return (
    <div
      className="mesh-gradient flex min-h-dvh flex-col items-center justify-center gap-6 px-6"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)"
      }}
    >
      <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-on-surface-variant uppercase opacity-80">
        Which app?
      </p>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <button
          className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-3xl bg-surface-container-high p-6 text-left shadow-lg ring-1 ring-white/5 transition-transform duration-300 active:scale-[0.97]"
          onClick={() => onSelect("adios")}
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/20 blur-[40px] transition-colors duration-500 group-hover:bg-primary/30" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest shadow-inner transition-shadow duration-300 group-hover:shadow-md">
            <span className="material-symbols-outlined is-filled text-2xl text-primary">headphones</span>
          </div>
          <div className="relative z-10">
            <h2 className="font-headline mb-1 text-xl text-on-surface transition-colors duration-300 group-hover:text-primary">
              Adios
            </h2>
            <p className="truncate text-sm text-on-surface-variant">Your lecture library &amp; player</p>
          </div>
        </button>

        <button
          className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-3xl bg-surface-container-high p-6 text-left shadow-lg ring-1 ring-white/5 transition-transform duration-300 active:scale-[0.97]"
          onClick={() => onSelect("salah")}
        >
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-secondary/10 blur-[40px] transition-colors duration-500 group-hover:bg-secondary/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest shadow-inner transition-shadow duration-300 group-hover:shadow-md">
            <span className="material-symbols-outlined is-filled text-2xl text-secondary">mosque</span>
          </div>
          <div className="relative z-10">
            <h2 className="font-headline mb-1 text-xl text-on-surface transition-colors duration-300 group-hover:text-secondary">
              Salah Tracker
            </h2>
            <p className="truncate text-sm text-on-surface-variant">Prayers, qada, streaks &amp; reminders</p>
          </div>
        </button>
      </div>

      <p className="mt-6 text-[11px] font-medium text-outline">Tap an app to continue</p>
    </div>
  );
}
