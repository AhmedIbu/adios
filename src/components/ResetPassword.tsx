import { useState } from "react";
import { supabase } from "../lib/supabase";
import { resolveDefaultApp } from "../lib/appMode";

const IS_SALAH = resolveDefaultApp() === "salah";

/** Shown when the app is opened via a Supabase password-recovery link. */
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  }

  return (
    <main className={`relative flex min-h-dvh items-center justify-center overflow-hidden p-6 ${IS_SALAH ? "salah-app" : ""}`}>
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center animate-app-in">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-card bg-primary-container shadow-md">
            <span className="material-symbols-outlined text-3xl text-on-primary-container">lock_reset</span>
          </div>
          <h1 className="font-headline text-2xl tracking-tight text-on-surface">Set a new password</h1>
        </div>

        <div className="flex w-full flex-col gap-5 rounded-card bg-surface-container-low p-8 shadow-xl">
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="flex flex-col gap-2">
              <label className="ml-2 text-xs font-medium text-on-surface-variant" htmlFor="reset-pass">
                New password
              </label>
              <input
                id="reset-pass"
                className="rounded-xl bg-surface-container-highest px-5 py-4 text-on-surface shadow-sm transition-colors placeholder:text-on-surface-variant/50 focus:bg-surface-variant focus:outline-none"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="ml-2 text-xs font-medium text-on-surface-variant" htmlFor="reset-confirm">
                Confirm password
              </label>
              <input
                id="reset-confirm"
                className="rounded-xl bg-surface-container-highest px-5 py-4 text-on-surface shadow-sm transition-colors placeholder:text-on-surface-variant/50 focus:bg-surface-variant focus:outline-none"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <button
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-on-primary shadow-md transition-colors hover:bg-primary-fixed-dim active:scale-[0.98] disabled:opacity-50"
              type="submit"
              disabled={busy || !password || !confirmPassword}
            >
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
