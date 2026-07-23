import { nextHijriOccurrence } from "../hijri";

export interface IslamicEvent {
  name: string;
  hijriMonth: number;
  hijriDay: number;
  note: string;
}

/**
 * Estimated by the umalqura calculated calendar — actual observance depends
 * on local moonsighting and can shift by a day, especially for Ramadan/Eid.
 */
export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: "Islamic New Year", hijriMonth: 1, hijriDay: 1, note: "1 Muharram" },
  { name: "Ashura", hijriMonth: 1, hijriDay: 10, note: "10 Muharram" },
  { name: "Mawlid al-Nabi", hijriMonth: 3, hijriDay: 12, note: "12 Rabi' al-Awwal" },
  { name: "Isra and Mi'raj", hijriMonth: 7, hijriDay: 27, note: "27 Rajab" },
  { name: "Start of Ramadan", hijriMonth: 9, hijriDay: 1, note: "1 Ramadan" },
  { name: "Laylat al-Qadr (estimated)", hijriMonth: 9, hijriDay: 27, note: "27 Ramadan, commonly observed" },
  { name: "Eid al-Fitr", hijriMonth: 10, hijriDay: 1, note: "1 Shawwal" },
  { name: "Day of Arafah", hijriMonth: 12, hijriDay: 9, note: "9 Dhul Hijjah" },
  { name: "Eid al-Adha", hijriMonth: 12, hijriDay: 10, note: "10 Dhul Hijjah" }
];

export interface UpcomingEvent extends IslamicEvent {
  date: Date;
  daysAway: number;
}

export function upcomingEvents(from: Date, count = 5): UpcomingEvent[] {
  const withDates = ISLAMIC_EVENTS.map((e) => {
    const date = nextHijriOccurrence(e.hijriMonth, e.hijriDay, from);
    const daysAway = Math.round((date.getTime() - from.getTime()) / 86400000);
    return { ...e, date, daysAway };
  });
  return withDates.sort((a, b) => a.daysAway - b.daysAway).slice(0, count);
}
