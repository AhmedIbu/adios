/**
 * Hijri date helpers built on Intl's umalqura calendar — no conversion
 * library needed, but no direct Hijri->Gregorian arithmetic either, so month
 * boundaries and "next occurrence" lookups are found by walking day-by-day
 * (bounded loops, cheap). The umalqura calendar is tabular/calculated, so
 * these dates are estimates — actual moonsighting-based observance can
 * differ by a day.
 */

const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

export interface HijriParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export function toHijri(date: Date): HijriParts {
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export const HIJRI_MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qadah",
  "Dhul Hijjah"
];

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** The Gregorian start/end dates of the Hijri month containing `anchor`. */
export function hijriMonthBounds(anchor: Date): { start: Date; end: Date; hijri: HijriParts } {
  const anchorHijri = toHijri(anchor);

  let start = anchor;
  for (let i = 0; i < 32; i++) {
    const prev = addDays(start, -1);
    if (toHijri(prev).month !== anchorHijri.month) break;
    start = prev;
  }

  let end = anchor;
  for (let i = 0; i < 32; i++) {
    const next = addDays(end, 1);
    if (toHijri(next).month !== anchorHijri.month) break;
    end = next;
  }

  return { start, end, hijri: toHijri(start) };
}

/** Steps to the same Hijri day-of-month in the next/prev Hijri month. */
export function shiftHijriMonth(anchor: Date, delta: 1 | -1): Date {
  const { start, end } = hijriMonthBounds(anchor);
  return delta > 0 ? addDays(end, 1) : addDays(start, -1);
}

/** Next Gregorian date (from `from`, inclusive) matching a given Hijri month/day. */
export function nextHijriOccurrence(hijriMonth: number, hijriDay: number, from: Date): Date {
  let cursor = from;
  for (let i = 0; i < 400; i++) {
    const h = toHijri(cursor);
    if (h.month === hijriMonth && h.day === hijriDay) return cursor;
    cursor = addDays(cursor, 1);
  }
  return from; // unreachable in practice
}
