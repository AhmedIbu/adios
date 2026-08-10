import { useState } from "react";
import { supabase } from "../lib/supabase";
import { resolveDefaultApp } from "../lib/appMode";

const IS_SALAH = resolveDefaultApp() === "salah";

/**
 * Shown exactly once per device. After a successful sign-in the session
 * persists and auto-refreshes, so you land straight in your library forever.
 */
export function Gate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <main
      className={`relative flex min-h-dvh items-center justify-center overflow-hidden p-6 ${IS_SALAH ? "salah-app" : ""}`}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[60%] w-[60%] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center animate-app-in">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-card bg-primary-container shadow-md">
            <span className="text-3xl" aria-hidden="true">
              {IS_SALAH ? "🕌" : "🎧"}
            </span>
          </div>
          <h1 className="font-headline text-2xl tracking-tight text-on-surface">
            {IS_SALAH ? "Salah Tracker" : "ADIOS"}
          </h1>
        </div>

        <div className="flex w-full flex-col gap-8 rounded-card bg-surface-container-low p-8 shadow-xl">
          <div className="text-center">
            <h2 className="font-headline mb-2 text-xl text-on-surface">Welcome back</h2>
            <p className="text-sm text-on-surface-variant">Sign in with the account made for you.</p>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            <div className="flex flex-col gap-2">
              <label className="ml-2 text-xs font-medium text-on-surface-variant" htmlFor="gate-email">
                Email Address
              </label>
              <input
                id="gate-email"
                className="rounded-xl bg-surface-container-highest px-5 py-4 text-on-surface shadow-sm transition-colors placeholder:text-on-surface-variant/50 focus:bg-surface-variant focus:outline-none"
                type="email"
                autoComplete="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="ml-2 text-xs font-medium text-on-surface-variant" htmlFor="gate-pass">
                Password
              </label>
              <input
                id="gate-pass"
                className="rounded-xl bg-surface-container-highest px-5 py-4 text-on-surface shadow-sm transition-colors placeholder:text-on-surface-variant/50 focus:bg-surface-variant focus:outline-none"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              className="group mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-fixed-dim active:scale-[0.98] disabled:opacity-50"
              type="submit"
              disabled={busy || !email || !password}
            >
              <span>{busy ? "Unlocking…" : "Unlock"}</span>
              {!busy && (
                <span
                  className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-16 text-center text-[11px] tracking-[0.25em] text-on-surface-variant/70 uppercase">
          {IS_SALAH ? "A quiet space for devotion" : "Designed for intentional listening"}
        </p>
      </div>
    </main>
  );
}
