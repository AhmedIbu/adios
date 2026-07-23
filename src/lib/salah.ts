import { supabase } from "./supabase";

export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type CorePrayer = (typeof PRAYERS)[number];
/** Bonus slot — never counted in isDayComplete/prayedCount/the 5-prayer streak. */
export const OPTIONAL_PRAYERS = ["tahajjud"] as const;
export type OptionalPrayer = (typeof OPTIONAL_PRAYERS)[number];
export type Prayer = CorePrayer | OptionalPrayer;
export type PrayerStatus = "on_time" | "late" | "missed";

export interface PrayerLog {
  id: string;
  day: string; // YYYY-MM-DD
  prayer: Prayer;
  status: PrayerStatus;
  /** Self-rated focus, 1–10. Null until the user rates it (rating is optional). */
  khushu: number | null;
  /** Whether the sunnah rakats were also prayed alongside the fard. */
  sunnah: boolean;
  /** Moment this status was written — refreshed on every write, used for prayer-time accuracy. */
  logged_at: string;
}

export interface SalahSettingsRow {
  latitude: number | null;
  longitude: number | null;
  calc_method: string;
  madhab: "shafi" | "hanafi";
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
  isha: "Isha",
  tahajjud: "Tahajjud"
};

// ---------- CRUD ----------

export async function listPrayerLogs(): Promise<PrayerLog[]> {
  const { data, error } = await supabase
    .from("prayer_logs")
    .select("id, day, prayer, status, khushu, sunnah, logged_at")
    .order("day", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PrayerLog[];
}

export async function setPrayerStatus(
  day: string,
  prayer: Prayer,
  status: PrayerStatus,
  khushu?: number
): Promise<PrayerLog> {
  const row: Record<string, unknown> = { day, prayer, status, logged_at: new Date().toISOString() };
  if (khushu !== undefined) row.khushu = khushu;
  const { data, error } = await supabase
    .from("prayer_logs")
    .upsert(row, { onConflict: "user_id,day,prayer" })
    .select("id, day, prayer, status, khushu, sunnah, logged_at")
    .single();
  if (error) throw error;
  return data as PrayerLog;
}

export async function getSalahSettings(): Promise<SalahSettingsRow | null> {
  const { data, error } = await supabase
    .from("salah_settings")
    .select("latitude, longitude, calc_method, madhab")
    .maybeSingle();
  if (error) throw error;
  return data as SalahSettingsRow | null;
}

export async function upsertSalahSettings(settings: SalahSettingsRow): Promise<SalahSettingsRow> {
  const { data, error } = await supabase
    .from("salah_settings")
    .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("latitude, longitude, calc_method, madhab")
    .single();
  if (error) throw error;
  return data as SalahSettingsRow;
}

/** Un-logs a prayer entirely — used to untoggle the optional Tahajjud slot. */
export async function clearPrayerStatus(day: string, prayer: Prayer): Promise<void> {
  const { error } = await supabase.from("prayer_logs").delete().match({ day, prayer });
  if (error) throw error;
}

/** The row must already exist (i.e. the prayer was already logged as prayed). */
export async function setSunnah(day: string, prayer: Prayer, sunnah: boolean): Promise<void> {
  const { error } = await supabase.from("prayer_logs").update({ sunnah }).match({ day, prayer });
  if (error) throw error;
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

/**
 * On time/late/missed/made-up counts for a period. There's no per-instance link
 * between a missed day and a qada log, so "made up" is an aggregate estimate:
 * whatever fraction of all-time misses (per prayer) have been paid off is applied
 * to that prayer's missed count within the period. Same aggregate model as qadaOwed().
 */
export function statusBreakdownWithQada(
  logs: PrayerLog[],
  qadaLogs: QadaLog[],
  from: Date,
  to: Date
): { on_time: number; late: number; missed: number; made_up: number } {
  const map = buildLogMap(logs);
  const base = statusBreakdown(logs, from, to);

  const missedAllTime = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<Prayer, number>;
  for (const l of logs) if (l.status === "missed") missedAllTime[l.prayer]++;
  const qadaAllTime = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<Prayer, number>;
  for (const q of qadaLogs) qadaAllTime[q.prayer]++;

  const missedInPeriod = missedCounts(map, from, to);

  let madeUp = 0;
  let stillMissed = 0;
  for (const p of PRAYERS) {
    const madeUpAllTime = Math.min(missedAllTime[p], qadaAllTime[p]);
    const ratio = missedAllTime[p] > 0 ? madeUpAllTime / missedAllTime[p] : 0;
    const periodMadeUp = Math.round(missedInPeriod[p] * ratio);
    madeUp += periodMadeUp;
    stillMissed += missedInPeriod[p] - periodMadeUp;
  }

  return { on_time: base.on_time, late: base.late, missed: stillMissed, made_up: madeUp };
}

/** Missed prayers (all time) minus logged make-ups, floored at zero per prayer. */
export function qadaOwed(logs: PrayerLog[], qadaLogs: QadaLog[]): Record<Prayer, number> {
  const owed = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<Prayer, number>;
  for (const l of logs) if (l.status === "missed") owed[l.prayer]++;
  for (const q of qadaLogs) owed[q.prayer] = Math.max(0, owed[q.prayer] - 1);
  return owed;
}

export interface QadaBacklogItem {
  day: string;
  prayer: CorePrayer;
}

/**
 * A concrete, oldest-first list of specific missed days still outstanding.
 * There's no per-instance link between a missed day and a qada log (same
 * limitation as qadaOwed/statusBreakdownWithQada), so this pays off each
 * prayer's OLDEST misses first, up to however many qada logs exist for
 * that prayer — a FIFO burn-down, not an exact record of which day was paid.
 */
export function qadaBacklog(logs: PrayerLog[], qadaLogs: QadaLog[]): QadaBacklogItem[] {
  const qadaCounts = Object.fromEntries(PRAYERS.map((p) => [p, 0])) as Record<CorePrayer, number>;
  for (const q of qadaLogs) {
    if ((PRAYERS as readonly string[]).includes(q.prayer)) {
      qadaCounts[q.prayer as CorePrayer]++;
    }
  }

  const backlog: QadaBacklogItem[] = [];
  for (const p of PRAYERS) {
    const missed = logs
      .filter((l) => l.prayer === p && l.status === "missed")
      .sort((a, b) => a.day.localeCompare(b.day));
    const remaining = missed.slice(qadaCounts[p]);
    for (const m of remaining) backlog.push({ day: m.day, prayer: p });
  }
  return backlog.sort((a, b) => a.day.localeCompare(b.day));
}

function weekStart(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // Monday-first
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return start;
}

export interface PeriodComparison {
  currentPct: number;
  bestPct: number;
  isNewBest: boolean;
}

/** This calendar month's completion % vs. the best completion % of any prior full month. */
export function monthComparison(map: LogMap, today: Date): PeriodComparison | null {
  const first = firstLoggedDay(map);
  if (!first) return null;

  const curFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const cur = completionStats(map, curFrom, today);
  const currentPct = cur.total > 0 ? (cur.prayed / cur.total) * 100 : 0;

  let bestPct = 0;
  let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  while (cursor < curFrom) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const stats = completionStats(map, cursor, monthEnd);
    if (stats.total > 0) bestPct = Math.max(bestPct, (stats.prayed / stats.total) * 100);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  if (bestPct === 0 && currentPct === 0) return null;
  return { currentPct, bestPct, isNewBest: bestPct > 0 && currentPct > bestPct };
}

/** This calendar week's completion % (so far) vs. the best completion % of any prior full week. */
export function weekComparison(map: LogMap, today: Date): PeriodComparison | null {
  const first = firstLoggedDay(map);
  if (!first) return null;

  const curFrom = weekStart(today);
  const cur = completionStats(map, curFrom, today);
  const currentPct = cur.total > 0 ? (cur.prayed / cur.total) * 100 : 0;

  let bestPct = 0;
  let cursor = weekStart(first);
  while (cursor < curFrom) {
    const weekEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6);
    const stats = completionStats(map, cursor, weekEnd);
    if (stats.total > 0) bestPct = Math.max(bestPct, (stats.prayed / stats.total) * 100);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }

  if (bestPct === 0 && currentPct === 0) return null;
  return { currentPct, bestPct, isNewBest: bestPct > 0 && currentPct > bestPct };
}

/** All 5 core prayers on time, with an average khushu rating of 8+ for the day. */
export function isPerfectDay(logs: PrayerLog[], day: string): boolean {
  const dayLogs = logs.filter((l) => l.day === day);
  const allOnTime = PRAYERS.every(
    (p) => dayLogs.find((l) => l.prayer === p)?.status === "on_time"
  );
  if (!allOnTime) return false;
  const rated = dayLogs.filter((l) => l.khushu != null).map((l) => l.khushu as number);
  if (rated.length === 0) return false;
  return rated.reduce((a, b) => a + b, 0) / rated.length >= 8;
}

/** Consecutive days ending today (or yesterday) with a logged Tahajjud. */
export function tahajjudStreak(logs: PrayerLog[], today: Date): number {
  const days = new Set(logs.filter((l) => l.prayer === "tahajjud").map((l) => l.day));
  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(toDayString(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toDayString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Average self-rated khushu across all core-prayer logs in the period, or null if none rated. */
export function averageKhushu(logs: PrayerLog[], from: Date, to: Date): number | null {
  const fromStr = toDayString(from);
  const toStr = toDayString(to);
  const vals = logs
    .filter((l) => l.day >= fromStr && l.day <= toStr && l.khushu != null)
    .map((l) => l.khushu as number);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Day-by-day average khushu within the period, for a trend line. Skips unrated days. */
export function khushuTrendSeries(
  logs: PrayerLog[],
  from: Date,
  to: Date
): { day: string; avg: number }[] {
  const fromStr = toDayString(from);
  const toStr = toDayString(to);
  const byDay = new Map<string, number[]>();
  for (const l of logs) {
    if (l.khushu == null) continue;
    if (l.day < fromStr || l.day > toStr) continue;
    const arr = byDay.get(l.day) ?? [];
    arr.push(l.khushu);
    byDay.set(l.day, arr);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, vals]) => ({ day, avg: vals.reduce((a, b) => a + b, 0) / vals.length }));
}

/** How often the sunnah rakats were prayed alongside a completed fard, in the period. */
export function sunnahStats(
  logs: PrayerLog[],
  from: Date,
  to: Date
): { prayedWithSunnah: number; totalPrayed: number } {
  const fromStr = toDayString(from);
  const toStr = toDayString(to);
  let prayedWithSunnah = 0;
  let totalPrayed = 0;
  for (const l of logs) {
    if (l.day < fromStr || l.day > toStr) continue;
    if (l.status === "on_time" || l.status === "late") {
      totalPrayed++;
      if (l.sunnah) prayedWithSunnah++;
    }
  }
  return { prayedWithSunnah, totalPrayed };
}
