import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * A new deploy (any git push) rebuilds the service worker; this shows a
 * small banner the moment the new one is ready, instead of silently
 * swapping the app under the user (registerType: "prompt" in vite.config).
 * "Update" reloads onto the new version; dismissing just keeps the old one
 * running until the next natural reload/relaunch.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (error) => console.error("SW registration failed", error)
  });

  if (!needRefresh) return null;

  return (
    <div
      className="fixed inset-x-0 z-[200] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-surface-high px-4 py-3 shadow-2xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <span className="material-symbols-outlined text-primary">system_update</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-on-surface">Update available</p>
        <p className="text-xs text-on-surface-dim">A newer version is ready.</p>
      </div>
      <button
        className="flex-none rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary active:scale-95"
        onClick={() => updateServiceWorker(true)}
      >
        Update
      </button>
      <button
        className="flex-none text-on-surface-dim"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
