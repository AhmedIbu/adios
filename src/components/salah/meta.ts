import type { Prayer } from "../../lib/salah";

export interface PrayerMeta {
  icon: string;
  /** Accent text color for the prayer's icon. */
  color: string;
  /** Soft background for the icon circle. */
  iconBg: string;
}

export const PRAYER_META: Record<Prayer, PrayerMeta> = {
  fajr: { icon: "wb_twilight", color: "text-tertiary", iconBg: "bg-tertiary/10" },
  dhuhr: { icon: "light_mode", color: "text-primary", iconBg: "bg-primary/10" },
  asr: { icon: "flare", color: "text-secondary", iconBg: "bg-secondary/10" },
  maghrib: { icon: "nights_stay", color: "text-[#f0a8bf]", iconBg: "bg-[#f0a8bf]/10" },
  isha: { icon: "bedtime", color: "text-on-primary-container", iconBg: "bg-primary-container/20" }
};
