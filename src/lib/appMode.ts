export type AppChoice = "picker" | "adios" | "salah";

/**
 * Locked to a single app two ways: at build time (VITE_DEFAULT_APP, per Vite
 * mode/env file) or at runtime via a "?app=" query param on the one shared
 * Vercel deployment — the latter is what the family APK's Capacitor shell
 * loads (adios-virid.vercel.app/?app=salah), so the same live URL that
 * updates on every push can serve a Salah-only experience for them without
 * a separate deployment, while the default (no param) still shows AppPicker.
 */
export function resolveDefaultApp(): AppChoice {
  const buildTime = import.meta.env.VITE_DEFAULT_APP as AppChoice | undefined;
  if (buildTime) return buildTime;
  const param = new URLSearchParams(window.location.search).get("app");
  if (param === "salah" || param === "adios") return param;
  return "picker";
}
