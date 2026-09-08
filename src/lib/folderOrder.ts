// Per-device folder display order — deliberately local (not synced via
// Supabase) since it's a personal browsing preference, not app data, and
// keeps this from needing a schema change for something this small.
const KEY = "folder-order";

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveOrder(order: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // ignore — falls back to the default order next load
  }
}

/** Orders `names` by the saved custom order; unknown names (new folders) are appended in their given order. */
export function applyFolderOrder(names: string[]): string[] {
  const saved = loadOrder();
  const known = saved.filter((n) => names.includes(n));
  const rest = names.filter((n) => !known.includes(n));
  return [...known, ...rest];
}

/** Moves `name` to `toIndex` in the custom order over `allNames`, and persists the result. */
export function moveFolderTo(allNames: string[], name: string, toIndex: number): void {
  const ordered = applyFolderOrder(allNames).filter((n) => n !== name);
  ordered.splice(toIndex, 0, name);
  saveOrder(ordered);
}
