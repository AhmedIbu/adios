// Per-folder default playback speed — local like folderOrder.ts, since this
// is a per-device listening preference rather than app data.
const KEY = (folder: string) => `folder-speed:${folder}`;

export function getFolderSpeed(folder: string): number | null {
  try {
    const v = localStorage.getItem(KEY(folder));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setFolderSpeed(folder: string, speed: number): void {
  try {
    localStorage.setItem(KEY(folder), String(speed));
  } catch {
    // ignore — falls back to the session speed next load
  }
}

export function clearFolderSpeed(folder: string): void {
  try {
    localStorage.removeItem(KEY(folder));
  } catch {
    // ignore
  }
}
