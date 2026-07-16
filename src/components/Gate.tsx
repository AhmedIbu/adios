import { useState } from "react";
import { supabase } from "../lib/supabase";

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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[60%] w-[60%] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-app-in">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container shadow-lg shadow-black/20">
            <span className="text-4xl" aria-hidden="true">
              🎧
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-on-surface">Adios</h1>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface-glass p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <header className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-on-surface">Welcome back</h2>
            <p className="text-on-surface-dim">One-time unlock for this device.</p>
          </header>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
          >
            <div className="space-y-2">
              <label
                className="block px-1 text-xs font-medium tracking-widest text-on-surface-dim uppercase"
                htmlFor="gate-email"
              >
                Email Address
              </label>
              <input
                id="gate-email"
                className="h-14 w-full rounded-lg border border-outline-dim bg-bg/40 px-4 text-on-surface transition-shadow duration-200 placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                className="block px-1 text-xs font-medium tracking-widest text-on-surface-dim uppercase"
                htmlFor="gate-pass"
              >
                Password
              </label>
              <input
                id="gate-pass"
                className="h-14 w-full rounded-lg border border-outline-dim bg-bg/40 px-4 text-on-surface transition-shadow duration-200 placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="pt-2">
              <button
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary shadow-xl shadow-black/30 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                type="submit"
                disabled={busy || !email || !password}
              >
                <span>{busy ? "Unlocking…" : "Unlock"}</span>
                {!busy && (
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    arrow_forward
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs tracking-widest text-on-surface-dim/40 select-none">
          DESIGNED FOR INTENTIONAL LISTENING
        </p>
      </div>
    </main>
  );
}
