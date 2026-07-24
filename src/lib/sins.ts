import { supabase } from "./supabase";

export interface SinType {
  id: string;
  name: string;
  severity: number; // 1 (mild) - 5 (major)
  sort_order: number;
}

export interface SinLog {
  id: string;
  sin_type_id: string;
  occurred_at: string;
  note: string | null;
}

const DEFAULT_SIN_NAMES = ["Music", "Explicit content", "Physical contact with non-mahram"];

// Mild orange -> dark red, index 0 = severity 1.
const SEVERITY_COLORS = ["#f0b868", "#e89a52", "#d9723f", "#c14a3a", "#8f1f1f"];

export function severityColor(severity: number): string {
  const idx = Math.min(5, Math.max(1, Math.round(severity))) - 1;
  return SEVERITY_COLORS[idx];
}

// ---------- Sin types ----------

export async function listSinTypes(): Promise<SinType[]> {
  const { data, error } = await supabase
    .from("sin_types")
    .select("id, name, severity, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SinType[];
}

/** Seeds the three starting categories the first time this loads, at a neutral mid severity. */
export async function seedDefaultSinTypesIfEmpty(): Promise<SinType[]> {
  const existing = await listSinTypes();
  if (existing.length > 0) return existing;
  const { data, error } = await supabase
    .from("sin_types")
    .insert(DEFAULT_SIN_NAMES.map((name, i) => ({ name, severity: 3, sort_order: i })))
    .select("id, name, severity, sort_order");
  if (error) throw error;
  return (data ?? []) as SinType[];
}

export async function createSinType(name: string, severity: number): Promise<SinType> {
  const { data, error } = await supabase
    .from("sin_types")
    .insert({ name, severity, sort_order: Date.now() })
    .select("id, name, severity, sort_order")
    .single();
  if (error) throw error;
  return data as SinType;
}

export async function updateSinType(
  id: string,
  updates: Partial<Pick<SinType, "name" | "severity">>
): Promise<SinType> {
  const { data, error } = await supabase
    .from("sin_types")
    .update(updates)
    .eq("id", id)
    .select("id, name, severity, sort_order")
    .single();
  if (error) throw error;
  return data as SinType;
}

export async function deleteSinType(id: string): Promise<void> {
  const { error } = await supabase.from("sin_types").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Sin logs ----------

export async function listSinLogs(): Promise<SinLog[]> {
  const { data, error } = await supabase
    .from("sin_logs")
    .select("id, sin_type_id, occurred_at, note")
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SinLog[];
}

export async function logSin(sinTypeId: string, note?: string): Promise<SinLog> {
  const { data, error } = await supabase
    .from("sin_logs")
    .insert({ sin_type_id: sinTypeId, note: note || null })
    .select("id, sin_type_id, occurred_at, note")
    .single();
  if (error) throw error;
  return data as SinLog;
}

export async function deleteSinLog(id: string): Promise<void> {
  const { error } = await supabase.from("sin_logs").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Derivations (pure) ----------

/** Days since the most recent log of this type, or null if never logged. */
export function daysSince(logs: SinLog[], sinTypeId: string, today: Date): number | null {
  const relevant = logs.filter((l) => l.sin_type_id === sinTypeId);
  if (relevant.length === 0) return null;
  const last = relevant.reduce((a, b) => (a.occurred_at > b.occurred_at ? a : b));
  const diffMs = today.getTime() - new Date(last.occurred_at).getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function countInRange(logs: SinLog[], sinTypeId: string, from: Date, to: Date): number {
  return logs.filter((l) => {
    if (l.sin_type_id !== sinTypeId) return false;
    const t = new Date(l.occurred_at).getTime();
    return t >= from.getTime() && t <= to.getTime();
  }).length;
}
