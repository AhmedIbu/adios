/**
 * Best-effort haptic feedback. No-op wherever the Vibration API isn't
 * available — notably iOS Safari, which has never implemented it, even
 * in home-screen PWAs.
 */
export function vibrate(pattern: number | number[] = 10): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
