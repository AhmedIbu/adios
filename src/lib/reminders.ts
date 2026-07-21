export type ReminderCategory = "quran" | "hadith" | "quote";

export interface Reminder {
  text: string;
  source: string;
  category: ReminderCategory;
}

/**
 * Bundled, curated collection — deliberately local rather than an external
 * API, so the daily reminder works offline and the translations stay ones
 * we chose. Only widely-known, well-attested texts; add favorites freely.
 */
export const REMINDERS: Reminder[] = [
  // ---- Quran ----
  {
    text: "Allah does not burden a soul beyond that it can bear.",
    source: "Surah Al-Baqarah 2:286",
    category: "quran"
  },
  {
    text: "Indeed, with hardship comes ease.",
    source: "Surah Ash-Sharh 94:6",
    category: "quran"
  },
  {
    text: "Verily, in the remembrance of Allah do hearts find rest.",
    source: "Surah Ar-Ra'd 13:28",
    category: "quran"
  },
  {
    text: "So remember Me; I will remember you.",
    source: "Surah Al-Baqarah 2:152",
    category: "quran"
  },
  {
    text: "Do not despair of the mercy of Allah.",
    source: "Surah Az-Zumar 39:53",
    category: "quran"
  },
  {
    text: "And whoever puts his trust in Allah — He is sufficient for him.",
    source: "Surah At-Talaq 65:3",
    category: "quran"
  },
  {
    text: "And seek help through patience and prayer.",
    source: "Surah Al-Baqarah 2:45",
    category: "quran"
  },
  {
    text: "And those who strive for Us — We will surely guide them to Our ways.",
    source: "Surah Al-Ankabut 29:69",
    category: "quran"
  },
  {
    text: "Indeed, Allah is with the patient.",
    source: "Surah Al-Baqarah 2:153",
    category: "quran"
  },
  {
    text: "And establish prayer for My remembrance.",
    source: "Surah Ta-Ha 20:14",
    category: "quran"
  },
  // ---- Hadith ----
  {
    text: "Actions are but by intentions.",
    source: "Sahih al-Bukhari & Muslim",
    category: "hadith"
  },
  {
    text: "The most beloved deeds to Allah are those done consistently, even if they are small.",
    source: "Sahih al-Bukhari & Muslim",
    category: "hadith"
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari & Muslim",
    category: "hadith"
  },
  {
    text: "Allah is gentle and loves gentleness in all things.",
    source: "Sahih al-Bukhari & Muslim",
    category: "hadith"
  },
  {
    text: "The strong is not the one who overcomes people; the strong is the one who controls himself when angry.",
    source: "Sahih al-Bukhari & Muslim",
    category: "hadith"
  },
  {
    text: "Make things easy and do not make them difficult.",
    source: "Sahih al-Bukhari",
    category: "hadith"
  },
  {
    text: "He who does not thank people has not thanked Allah.",
    source: "Abu Dawud & Tirmidhi",
    category: "hadith"
  },
  {
    text: "Purity is half of faith.",
    source: "Sahih Muslim",
    category: "hadith"
  },
  {
    text: "Your smiling in the face of your brother is charity.",
    source: "Jami' at-Tirmidhi",
    category: "hadith"
  },
  {
    text: "The best among you are those who learn the Qur'an and teach it.",
    source: "Sahih al-Bukhari",
    category: "hadith"
  },
  {
    text: "Be in this world as if you were a stranger or a traveler.",
    source: "Sahih al-Bukhari",
    category: "hadith"
  },
  // ---- Quotes ----
  {
    text: "Take account of yourselves before you are taken to account.",
    source: "Umar ibn al-Khattab (RA)",
    category: "quote"
  },
  {
    text: "Knowledge is not what is memorized; knowledge is what benefits.",
    source: "Imam Ash-Shafi'i",
    category: "quote"
  },
  {
    text: "O son of Adam, you are nothing but days — whenever a day passes, a part of you passes with it.",
    source: "Hasan al-Basri",
    category: "quote"
  },
  {
    text: "What can my enemies do to me? My paradise is in my heart; it is with me wherever I go.",
    source: "Ibn Taymiyyah",
    category: "quote"
  }
];

/** Same reminder for the whole calendar day; changes when the date changes. */
export function dailyReminder(dayString: string): Reminder {
  let hash = 0;
  for (let i = 0; i < dayString.length; i++) {
    hash = (hash * 31 + dayString.charCodeAt(i)) >>> 0;
  }
  return REMINDERS[hash % REMINDERS.length];
}
