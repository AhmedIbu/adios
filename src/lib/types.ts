export type Folder = "music" | "lectures" | "notes";

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

export const FOLDERS: { id: Folder | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "lectures", label: "Lectures" },
  { id: "notes", label: "Notes" }
];

export function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
}
