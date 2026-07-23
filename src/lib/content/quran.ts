import { get, set } from "idb-keyval";

const API_BASE = "https://api.alquran.cloud/v1";
const EDITIONS = "quran-uthmani,en.sahih,en.transliteration";

export interface QuranAyah {
  number: number;
  arabic: string;
  transliteration: string;
  translation: string;
}

export interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  ayahs: QuranAyah[];
}

interface EditionResponse {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  edition: { identifier: string };
  ayahs: { number: number; numberInSurah: number; text: string }[];
}

const CACHE_KEY = (n: number) => `quran-surah:${n}`;

/** Deterministic pick across all 114 surahs, rotating monthly. */
export function monthlySurahNumber(month: Date): number {
  const index = month.getFullYear() * 12 + month.getMonth();
  return (((index % 114) + 114) % 114) + 1;
}

export function quranComUrl(surahNumber: number): string {
  return `https://quran.com/${surahNumber}`;
}

/** Quran text never changes, so once cached a surah is cached for good — no revalidation needed. */
export async function loadSurah(number: number): Promise<QuranSurah> {
  const cached = (await get(CACHE_KEY(number))) as QuranSurah | undefined;
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/surah/${number}/editions/${EDITIONS}`);
  if (!res.ok) throw new Error(`Al Quran Cloud request failed (${res.status})`);
  const body = (await res.json()) as { data: EditionResponse[] };

  const arabicEd = body.data.find((d) => d.edition.identifier === "quran-uthmani");
  const translationEd = body.data.find((d) => d.edition.identifier === "en.sahih");
  const transliterationEd = body.data.find((d) => d.edition.identifier === "en.transliteration");
  if (!arabicEd || !translationEd || !transliterationEd) {
    throw new Error("Unexpected response from Al Quran Cloud");
  }

  const ayahs: QuranAyah[] = arabicEd.ayahs.map((a, i) => ({
    number: a.numberInSurah,
    arabic: a.text,
    transliteration: transliterationEd.ayahs[i]?.text ?? "",
    translation: translationEd.ayahs[i]?.text ?? ""
  }));

  const surah: QuranSurah = {
    number: arabicEd.number,
    name: arabicEd.name,
    englishName: arabicEd.englishName,
    englishNameTranslation: arabicEd.englishNameTranslation,
    numberOfAyahs: arabicEd.numberOfAyahs,
    ayahs
  };

  await set(CACHE_KEY(number), surah);
  return surah;
}
