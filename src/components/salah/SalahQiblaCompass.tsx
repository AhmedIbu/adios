import { useEffect, useRef, useState } from "react";
import type { SalahSettingsRow } from "../../lib/salah";
import { hasLocation } from "../../lib/prayertimes";
import { qiblaBearing } from "../../lib/qibla";

interface Props {
  settings: SalahSettingsRow | null;
}

type Permission = "idle" | "requesting" | "granted" | "denied" | "unsupported";

// iOS gates DeviceOrientationEvent behind an explicit, gesture-triggered
// permission prompt; other platforms fire events with no prompt at all.
function needsIOSPermission(): boolean {
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  return typeof DOE?.requestPermission === "function";
}

export function SalahQiblaCompass({ settings }: Props) {
  const [permission, setPermission] = useState<Permission>("idle");
  const [heading, setHeading] = useState<number | null>(null);
  const listenerAttached = useRef(false);

  const located = hasLocation(settings);
  const bearing = located ? qiblaBearing(settings.latitude, settings.longitude) : null;

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOrientation(e: DeviceOrientationEvent & { webkitCompassHeading?: number }) {
    if (typeof e.webkitCompassHeading === "number") {
      setHeading(e.webkitCompassHeading);
    } else if (e.alpha != null) {
      setHeading(360 - e.alpha);
    }
  }

  function attachListener() {
    if (listenerAttached.current) return;
    listenerAttached.current = true;
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, handleOrientation as EventListener);
  }

  async function enableCompass() {
    if (!window.DeviceOrientationEvent) {
      setPermission("unsupported");
      return;
    }
    if (needsIOSPermission()) {
      setPermission("requesting");
      try {
        const DOE = window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> };
        const result = await DOE.requestPermission();
        if (result === "granted") {
          setPermission("granted");
          attachListener();
        } else {
          setPermission("denied");
        }
      } catch (e) {
        console.error(e);
        setPermission("denied");
      }
    } else {
      setPermission("granted");
      attachListener();
    }
  }

  if (!located) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
        Set your location in Settings first — the Qibla direction is calculated from it.
      </p>
    );
  }

  const dialRotation = heading !== null ? -heading : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="relative h-60 w-60">
        <div
          className="absolute inset-0 rounded-full shadow-inner"
          style={{ background: "var(--s-surface-container-low)", border: "1px solid var(--s-outline-variant)" }}
        />
        {/* Fixed pointer showing the direction the top of the phone faces. */}
        <div
          className="absolute left-1/2 top-1 h-4 w-4 -translate-x-1/2"
          style={{ color: "var(--s-on-surface-variant)" }}
        >
          <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
        </div>
        {["N", "E", "S", "W"].map((label, i) => {
          const angleRad = (((i * 90 + dialRotation) % 360) * Math.PI) / 180;
          const x = 108 * Math.sin(angleRad);
          const y = -108 * Math.cos(angleRad);
          return (
            <span
              key={label}
              className="absolute left-1/2 top-1/2 text-xs font-bold transition-transform duration-150 ease-linear"
              style={{
                color: label === "N" ? "var(--s-primary)" : "var(--s-on-surface-variant)",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
              }}
            >
              {label}
            </span>
          );
        })}
        {bearing !== null && (
          <div
            className="absolute left-1/2 top-1/2 transition-transform duration-150 ease-linear"
            style={{
              transform: `translate(calc(-50% + ${90 * Math.sin((((bearing + dialRotation) % 360) * Math.PI) / 180)}px), calc(-50% + ${-90 * Math.cos((((bearing + dialRotation) % 360) * Math.PI) / 180)}px))`
            }}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--s-tertiary)" }}>
              mosque
            </span>
          </div>
        )}
        <div
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--s-primary)" }}
        />
      </div>

      {bearing !== null && (
        <p className="text-sm" style={{ color: "var(--s-on-surface-variant)" }}>
          Qibla is <span style={{ color: "var(--s-on-surface)", fontWeight: 600 }}>{Math.round(bearing)}°</span> from true north
        </p>
      )}

      {permission !== "granted" && (
        <button
          className="rounded-full px-6 py-3 text-sm font-bold transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: "var(--s-primary)", color: "var(--s-on-primary)" }}
          onClick={enableCompass}
          disabled={permission === "requesting"}
        >
          {permission === "requesting" ? "Requesting…" : "Enable compass"}
        </button>
      )}
      {permission === "denied" && (
        <p className="max-w-[240px] text-center text-xs" style={{ color: "var(--s-error)" }}>
          Compass access was denied — enable motion & orientation access for this site in your browser
          settings to use live heading.
        </p>
      )}
      {permission === "unsupported" && (
        <p className="max-w-[240px] text-center text-xs" style={{ color: "var(--s-on-surface-variant)" }}>
          Your device doesn't expose a compass sensor to the browser — use the bearing above with a
          separate compass instead.
        </p>
      )}
    </div>
  );
}
