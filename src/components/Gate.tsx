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
    <main className="gate">
      <div className="gate__card">
        <div className="gate__logo" aria-hidden="true">
          🎧
        </div>
        <h1 className="gate__title">Adios</h1>
        <p className="gate__sub">One-time unlock for this device.</p>
        <label className="gate__label" htmlFor="gate-email">
          Email
        </label>
        <input
          id="gate-email"
          className="gate__input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="gate__label" htmlFor="gate-pass">
          Password
        </label>
        <input
          id="gate-pass"
          className="gate__input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />
        {error && <p className="gate__error">{error}</p>}
        <button className="gate__button" onClick={signIn} disabled={busy || !email || !password}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </div>
    </main>
  );
}
