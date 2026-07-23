import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import type { CorePrayer, PrayerLog, SalahSettingsRow } from "./salah";
import { PRAYERS, toDayString } from "./salah";

export type CalcMethodKey =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "NorthAmerica"
  | "MoonsightingCommittee"
  | "Singapore"
  | "Turkey";

export const CALC_METHODS: CalcMethodKey[] = [
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "UmmAlQura",
  "NorthAmerica",
  "MoonsightingCommittee",
  "Singapore",
  "Turkey"
];

export const CALC_METHOD_LABELS: Record<CalcMethodKey, string> = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Karachi",
  UmmAlQura: "Umm Al-Qura, Makkah",
  NorthAmerica: "ISNA (North America)",
  MoonsightingCommittee: "Moonsighting Committee",
  Singapore: "Singapore",
  Turkey: "Turkey (Diyanet)"
};

function isCalcMethodKey(v: string): v is CalcMethodKey {
  return (CALC_METHODS as string[]).includes(v);
}

function calcParams(settings: SalahSettingsRow) {
  const key = isCalcMethodKey(settings.calc_method) ? settings.calc_method : "MuslimWorldLeague";
  const params = CalculationMethod[key]();
  params.madhab = settings.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function hasLocation(settings: SalahSettingsRow | null): settings is SalahSettingsRow & {
  latitude: number;
  longitude: number;
} {
  return !!settings && settings.latitude != null && settings.longitude != null;
}

/** Computed adhan times for one local calendar day, keyed by core prayer. */
export function computeDayTimes(
  settings: SalahSettingsRow,
  date: Date
): Record<CorePrayer, Date> | null {
  if (!hasLocation(settings)) return null;
  const coords = new Coordinates(settings.latitude, settings.longitude);
  const times = new PrayerTimes(coords, date, calcParams(settings));
  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha
  };
}

/** Minutes actual is after (+) or before (-) scheduled. */
export function deltaMinutes(scheduled: Date, actual: Date): number {
  return Math.round((actual.getTime() - scheduled.getTime()) / 60000);
}

export function formatDelta(min: number): string {
  if (Math.abs(min) < 1) return "right on time";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h === 0) parts.push(`${m}m`);
  return `${parts.join(" ")} ${min > 0 ? "after" : "before"}`;
}

/** Average delta (minutes, +after/-before adhan) per prayer across on_time/late logs in the period. */
export function accuracyByPrayer(
  logs: PrayerLog[],
  settings: SalahSettingsRow | null,
  from: Date,
  to: Date
): Partial<Record<CorePrayer, number>> {
  if (!hasLocation(settings)) return {};
  const fromStr = toDayString(from);
  const toStr = toDayString(to);
  const sums: Partial<Record<CorePrayer, { total: number; count: number }>> = {};

  for (const l of logs) {
    if (l.day < fromStr || l.day > toStr) continue;
    if (l.status !== "on_time" && l.status !== "late") continue;
    if (!(PRAYERS as readonly string[]).includes(l.prayer)) continue;
    const p = l.prayer as CorePrayer;
    const dayTimes = computeDayTimes(settings, new Date(l.day + "T00:00:00"));
    if (!dayTimes) continue;
    const d = deltaMinutes(dayTimes[p], new Date(l.logged_at));
    const bucket = sums[p] ?? { total: 0, count: 0 };
    bucket.total += d;
    bucket.count += 1;
    sums[p] = bucket;
  }

  const out: Partial<Record<CorePrayer, number>> = {};
  for (const p of PRAYERS) {
    const b = sums[p];
    if (b) out[p] = Math.round(b.total / b.count);
  }
  return out;
}
