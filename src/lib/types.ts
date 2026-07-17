export type Folder = string;

export interface Track {
  id: string;
  user_id: string;
  title: string;
  folder: Folder;
  duration: number;
  position: number;
  storage_path: string;
  created_at: string;
}

export const DEFAULT_FOLDERS = [
  "music",
  "beginning-to-the-end",
  "emotional-reminders",
  "lessons-from-quran",
  "motivational-reminders",
  "powerful-reminders",
  "notes"
];

/** Legacy folders were created as hyphenated slugs; new ones are typed as-is. */
export function folderLabel(name: string): string {
  if (name.includes("-") && !name.includes(" ")) {
    return name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return name;
}

export function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
}
