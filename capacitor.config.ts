import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ahmedibu.salahtracker",
  appName: "Salah Tracker",
  // webDir is still required by the CLI (used for the offline fallback shell
  // synced into the native project), but server.url makes the app actually
  // navigate to the live Vercel deployment instead of the bundled copy — so
  // every push you make shows up for everyone next time they open the app,
  // no APK rebuild/reinstall needed. ?app=salah locks the shared deployment
  // into Salah-only mode (see resolveDefaultApp in src/App.tsx).
  webDir: "dist",
  server: {
    url: "https://adios-virid.vercel.app/?app=salah",
    cleartext: false
  }
};

export default config;
