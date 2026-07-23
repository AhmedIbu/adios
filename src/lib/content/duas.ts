export interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

/**
 * Short, widely-known daily duas — bundled locally so this works offline and
 * stays consistent. Not exhaustive; add your own favorites over time.
 */
export const DUAS: Dua[] = [
  {
    id: "waking",
    title: "Upon waking",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alhamdu lillahil-lathi ahyana ba'da ma amatana wa-ilayhin-nushur",
    translation: "Praise be to Allah who gave us life after having taken it from us, and unto Him is the resurrection.",
    source: "Sahih al-Bukhari"
  },
  {
    id: "before-eating",
    title: "Before eating",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah",
    translation: "In the name of Allah.",
    source: "Abu Dawud"
  },
  {
    id: "after-eating",
    title: "After eating",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdu lillahil-lathi at'amani hatha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: "Praise be to Allah who fed me this and provided it for me without any might or power on my part.",
    source: "Abu Dawud & Tirmidhi"
  },
  {
    id: "entering-home",
    title: "Entering the home",
    arabic: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا",
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala rabbina tawakkalna",
    translation: "In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we place our trust.",
    source: "Abu Dawud"
  },
  {
    id: "anxiety",
    title: "For anxiety and worry",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow.",
    source: "Sahih al-Bukhari"
  },
  {
    id: "for-parents",
    title: "For parents",
    arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    transliteration: "Rabbi irhamhuma kama rabbayani sagheera",
    translation: "My Lord, have mercy upon them as they raised me when I was small.",
    source: "Surah Al-Isra 17:24"
  },
  {
    id: "travel",
    title: "Setting out on a journey",
    arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى",
    transliteration: "Allahumma inna nas-aluka fi safarina hatha al-birra wat-taqwa",
    translation: "O Allah, we ask You on this journey of ours for righteousness and piety.",
    source: "Sahih Muslim"
  },
  {
    id: "before-sleep",
    title: "Before sleeping",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amutu wa ahya",
    translation: "In Your name, O Allah, I die and I live.",
    source: "Sahih al-Bukhari"
  },
  {
    id: "distress",
    title: "In times of distress",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal wakeel",
    translation: "Allah is sufficient for us, and He is the best disposer of affairs.",
    source: "Surah Aal-Imran 3:173"
  },
  {
    id: "forgiveness",
    title: "Seeking forgiveness",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    transliteration: "Rabbi ighfir li wa tub 'alayya innaka antat-tawwabur-raheem",
    translation: "My Lord, forgive me and accept my repentance; indeed You are the Accepting of repentance, the Merciful.",
    source: "Abu Dawud & Tirmidhi"
  }
];

/** Same dua for the whole calendar week (Mon-start), rotating through the library. */
export function weeklyDua(dayString: string): Dua {
  const d = new Date(dayString + "T00:00:00");
  const weekOffset = (d.getDay() + 6) % 7;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - weekOffset);
  // ISO-ish week number, coarse but stable and deterministic for rotation purposes.
  const weekNumber = Math.floor(weekStart.getTime() / (7 * 86400000));
  return DUAS[((weekNumber % DUAS.length) + DUAS.length) % DUAS.length];
}
