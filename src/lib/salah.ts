import { supabase } from "./supabase";

export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type Prayer = (typeof PRAYERS)[number];
export type PrayerStatus = "on_time" | "late" | "missed";

export interface PrayerLog {
  id: string;
  day: string; // YYYY-MM-DD
  prayer: Prayer;
  status: PrayerStatus;
}

export interface QadaLog {
  id: string;
  prayer: Prayer;
  completed_at: string;
}

export const PRAYER_LABELS: Record<Prayer, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha"
};

// ---------- CRUD ----------

export async function listPrayerLogs(): Promise<PrayerLog[]> {
  const { data, error } = await supabase
    .from("prayer_logs")
    .select("id, day, prayer, status")
    .order("day", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PrayerLog[];
}

export async function setPrayerStatus(
  day: string,
  prayer: Prayer,
  status: PrayerStatus
): Promise<PrayerLog> {
  const { data, error } = await supabase
    .from("prayer_logs")
    .upsert({ day, prayer, status }, { onConflict: "user_id,day,prayer" })
    .select("id, day, prayer, status")
    .single();
  if (error) throw error;
  return data as PrayerLog;
}

export async function listQadaLogs(): Promise<QadaLog[]> {
  const { data, error } = await supabase
    .from("qada_logs")
    .select("id, prayer, completed_at")
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QadaLog[];
}

export async function logQada(prayer: Prayer): Promise<QadaLog> {
  const { data, error } = await supabase
    .from("qada_logs")
    .insert({ prayer })
    .select("id, prayer, completed_at")
    .single();
  if (error) throw error;
  return data as QadaLog;
}

// ---------- Derivations (pure) ----------

/** Local-timezone YYYY-MM-DD (toISOString would shift the day near midnight). */
export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type LogMap = Map<string, Partial<Record<Prayer, PrayerStatus>>>;

export function buildLogMap(logs: PrayerLog[]): LogMap {
  const map: LogMap = new Map();
  for (const l of logs) {
    const entry = map.get(l.day) ?? {};
    entry[l.prayer] = l.status;
    map.set(l.day, entry);
  }
  return map;
}

export function prayedCount(dayEntry: Partial<Record<Prayer, PrayerStatus>> | undefined): number {
  if (!dayEntry) return 0;
  return PRAYERS.filter((p) => dayEntry[p] === "on_time" || dayEntry[p] === "late").length;
}

export function isDayComplete(
  dayEntry: Partial<Record<Prayer, PrayerStatus>> | undefined
): boolean {
  return prayedCount(dayEntry) === PRAYERS.length;
}

/** Consecutive fully-prayed days ending today (or yesterday if today isn't finished yet). */
export function currentStreak(map: LogMap, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  if (!isDayComplete(map.get(toDayString(cursor)))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (isDayComplete(map.get(toDayString(cursor)))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(map: LogMap): number {
  const days = [...map.keys()].sort();
  if (days.length === 0) return 0;
  let longest = 0;
  let run = 0;
  const cursor = new Date(days[0] + "T00:00:00");
  const end = new Date(days[days.length - 1] + "T00:00:00");
  while (cursor <= end) {
    if (isDayComplete(map.get(toDayString(cursor)))) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return longest;
}

/** Prayed slots vs total slots between from and to (inclusive), 5 per day. */
export function completionStats(
  map: LogMap,
  from: Date,
  to: Date
): { prayed: number; total: number } {
  let prayed = 0;
  let total = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    total += PRAYERS.length;
    prayed += prayedCount(map.get(toDayString(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { prayed, total };
}

export function firstLoggedDay(map: LogMap): Date | null {
  const days = [...map.keys()].sort();
  return days.length > 0 ? new Date(days[0] + "T00:00:00") : null;
}

export function missedCounts(map: LogMap, from: Date, to: Date): Record<Prayer, number> {
  const counts = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<Prayer, number>;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const entry = map.get(toDayString(cursor));
    if (entry) {
      for (const p of PRAYERS) if (entry[p] === "missed") counts[p]++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return counts;
}

/** Count of logged prayers by status within from/to (inclusive), across all prayers. */
export function statusBreakdown(
  logs: PrayerLog[],
  from: Date,
  to: Date
): Record<PrayerStatus, number> {
  const fromStr = toDayString(from);
  const toStr = toDayString(to);
  const counts: Record<PrayerStatus, number> = { on_time: 0, late: 0, missed: 0 };
  for (const l of logs) {
    if (l.day >= fromStr && l.day <= toStr) counts[l.status]++;
  }
  return counts;
}

/** Missed prayers (all time) minus logged make-ups, floored at zero per prayer. */
export function qadaOwed(logs: PrayerLog[], qadaLogs: QadaLog[]): Record<Prayer, number> {
  const owed = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<Prayer, number>;
  for (const l of logs) if (l.status === "missed") owed[l.prayer]++;
  for (const q of qadaLogs) owed[q.prayer] = Math.max(0, owed[q.prayer] - 1);
  return owed;
}
