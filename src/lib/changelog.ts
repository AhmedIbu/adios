export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  items: string[];
}

/**
 * Newest first. A short, hand-written entry for each release worth telling
 * Ibu about — shown in the "Update available" banner. Not auto-generated
 * from commits, so keep entries brief and user-facing.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-08",
    items: [
      "Qibla compass, Ramadan mode, and bookmarkable duas",
      "Shareable stats card, 6-month trend, and a richer milestones list",
      "Sign-out, auto dark/light theme, and in-app password reset",
      "Folder drag-reorder, per-folder playback speed, and a waveform seek bar"
    ]
  }
];
