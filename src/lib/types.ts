export type Folder =
  | "music"
  | "beginning-to-the-end"
  | "emotional-reminders"
  | "lessons-from-quran"
  | "motivational-reminders"
  | "powerful-reminders"
  | "notes";

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

export const FOLDER_LABELS: Record<Folder, string> = {
  music: "Music",
  "beginning-to-the-end": "Beginning to the End",
  "emotional-reminders": "Emotional Reminders",
  "lessons-from-quran": "Lessons from Quran",
  "motivational-reminders": "Motivational Reminders",
  "powerful-reminders": "Powerful Reminders",
  notes: "Notes"
};

export const FOLDERS: { id: Folder | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "music", label: FOLDER_LABELS.music },
  { id: "beginning-to-the-end", label: FOLDER_LABELS["beginning-to-the-end"] },
  { id: "emotional-reminders", label: FOLDER_LABELS["emotional-reminders"] },
  { id: "lessons-from-quran", label: FOLDER_LABELS["lessons-from-quran"] },
  { id: "motivational-reminders", label: FOLDER_LABELS["motivational-reminders"] },
  { id: "powerful-reminders", label: FOLDER_LABELS["powerful-reminders"] },
  { id: "notes", label: FOLDER_LABELS.notes }
];

export function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
}
