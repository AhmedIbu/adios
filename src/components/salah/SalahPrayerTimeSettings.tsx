import { useState } from "react";
import type { SalahSettingsRow } from "../../lib/salah";
import { CALC_METHODS, CALC_METHOD_LABELS } from "../../lib/prayertimes";

interface Props {
  settings: SalahSettingsRow | null;
  onSave: (settings: SalahSettingsRow) => Promise<void>;
  onClose: () => void;
}

export function SalahPrayerTimeSettings({ settings, onSave, onClose }: Props) {
  const [latitude, setLatitude] = useState<number | null>(settings?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(settings?.longitude ?? null);
  const [calcMethod, setCalcMethod] = useState(settings?.calc_method ?? "MuslimWorldLeague");
  const [madhab, setMadhab] = useState<"shafi" | "hanafi">(settings?.madhab ?? "shafi");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setLocError("Couldn't get your location — check permissions and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ latitude, longitude, calc_method: calcMethod, madhab });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Couldn't save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-xl rounded-t-3xl bg-surface pb-8 shadow-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <h3 className="px-5 pt-2 pb-1 text-center text-base font-semibold text-on-surface">
          Prayer time settings
        </h3>
        <p className="px-5 pb-4 text-center text-xs text-on-surface-dim">
          Used only to compute adhan times locally, on your device — no location is sent
          anywhere.
        </p>

        <div className="space-y-5 px-6">
          <div>
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
              onClick={useMyLocation}
              disabled={locating}
            >
              <span className="text-sm font-semibold text-on-surface">
                {locating ? "Getting your location…" : "Use my current location"}
              </span>
              <span className="material-symbols-outlined text-primary">my_location</span>
            </button>
            <p className="mt-2 text-xs text-on-surface-dim">
              {latitude != null && longitude != null
                ? `Set: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
                : "Not set yet."}
            </p>
            {locError && <p className="mt-1 text-xs text-error">{locError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
              Calculation method
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-surface-high px-3 py-2.5 text-sm text-on-surface"
              value={calcMethod}
              onChange={(e) => setCalcMethod(e.target.value)}
            >
              {CALC_METHODS.map((m) => (
                <option key={m} value={m}>
                  {CALC_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
              Madhab (affects Asr time)
            </label>
            <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/5 bg-black/20 p-1">
              {(["shafi", "hanafi"] as const).map((m) => (
                <button
                  key={m}
                  className={`rounded-full py-2 text-center text-[11px] font-extrabold tracking-widest uppercase transition-colors duration-200 ${
                    madhab === m
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-dim hover:text-on-surface"
                  }`}
                  onClick={() => setMadhab(m)}
                >
                  {m === "shafi" ? "Shafi / most" : "Hanafi"}
                </button>
              ))}
            </div>
          </div>

          <button
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-on-primary disabled:opacity-60"
            onClick={handleSave}
            disabled={saving || latitude == null || longitude == null}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {latitude == null && (
            <p className="text-center text-xs text-on-surface-dim">
              Set your location above to enable prayer-time accuracy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
