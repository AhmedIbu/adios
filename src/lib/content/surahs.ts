export interface Ayah {
  arabic: string;
  transliteration: string;
  translation: string;
}

export interface SurahEntry {
  slug: string;
  number: number;
  name: string;
  arabicName: string;
  ayahs: Ayah[];
  reflection: string;
}

/**
 * Deliberately only the shortest surahs, in full — long enough to sit with
 * for a month, short enough not to wholesale-reproduce a large copyrighted
 * translation. For deeper tafsir, each links out to quran.com rather than
 * having tafsir text embedded here.
 */
export const SURAHS: SurahEntry[] = [
  {
    slug: "al-fatiha",
    number: 1,
    name: "Al-Fatiha",
    arabicName: "الفاتحة",
    ayahs: [
      { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", transliteration: "Bismillahir-Rahmanir-Raheem", translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
      { arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", transliteration: "Alhamdu lillahi rabbil-'alameen", translation: "All praise is due to Allah, Lord of the worlds." },
      { arabic: "الرَّحْمَٰنِ الرَّحِيمِ", transliteration: "Ar-Rahmanir-Raheem", translation: "The Entirely Merciful, the Especially Merciful." },
      { arabic: "مَالِكِ يَوْمِ الدِّينِ", transliteration: "Maliki yawmid-deen", translation: "Sovereign of the Day of Recompense." },
      { arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", transliteration: "Iyyaka na'budu wa iyyaka nasta'een", translation: "It is You we worship and You we ask for help." },
      { arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", transliteration: "Ihdinas-siratal-mustaqeem", translation: "Guide us to the straight path." },
      { arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", transliteration: "Siratal-latheena an'amta 'alayhim ghayril-maghdoobi 'alayhim wa lad-dalleen", translation: "The path of those upon whom You have bestowed favor, not of those who have evoked anger or of those who are astray." }
    ],
    reflection: "The opening of the Quran, and the surah every prayer repeats — a compact statement of who Allah is and what we're asking of Him. Worth reading slowly instead of on autopilot this month."
  },
  {
    slug: "al-ikhlas",
    number: 112,
    name: "Al-Ikhlas",
    arabicName: "الإخلاص",
    ayahs: [
      { arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", transliteration: "Qul huwallahu ahad", translation: "Say, He is Allah, [who is] One." },
      { arabic: "اللَّهُ الصَّمَدُ", transliteration: "Allahus-samad", translation: "Allah, the Eternal Refuge." },
      { arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ", transliteration: "Lam yalid wa lam yoolad", translation: "He neither begets nor is born." },
      { arabic: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", transliteration: "Wa lam yakun lahu kufuwan ahad", translation: "Nor is there to Him any equivalent." }
    ],
    reflection: "Four lines that define Islamic monotheism completely. Said to be equal to a third of the Quran in reward for its concentrated meaning — a good one to actually memorize if you haven't."
  },
  {
    slug: "al-asr",
    number: 103,
    name: "Al-Asr",
    arabicName: "العصر",
    ayahs: [
      { arabic: "وَالْعَصْرِ", transliteration: "Wal-'asr", translation: "By time," },
      { arabic: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ", transliteration: "Innal-insana lafee khusr", translation: "Indeed, mankind is in loss," },
      { arabic: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ", transliteration: "Illal-latheena amanu wa 'amilus-salihati wa tawasaw bilhaqqi wa tawasaw bissabr", translation: "Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience." }
    ],
    reflection: "Imam Ash-Shafi'i said if people reflected on this surah alone it would be sufficient for them — a whole framework for a meaningful life in three lines: believe, act well, and hold each other to truth and patience."
  },
  {
    slug: "al-kawthar",
    number: 108,
    name: "Al-Kawthar",
    arabicName: "الكوثر",
    ayahs: [
      { arabic: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ", transliteration: "Inna a'taynakal-kawthar", translation: "Indeed, We have granted you, [O Muhammad], al-Kawthar." },
      { arabic: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", transliteration: "Fasalli lirabbika wanhar", translation: "So pray to your Lord and sacrifice [to Him alone]." },
      { arabic: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", transliteration: "Inna shani-aka huwal-abtar", translation: "Indeed, your enemy is the one cut off." }
    ],
    reflection: "The shortest surah in the Quran, revealed to comfort the Prophet ﷺ after loss and mockery — a reminder that what looks like being 'cut off' from the outside rarely matches what Allah is actually giving."
  },
  {
    slug: "an-nasr",
    number: 110,
    name: "An-Nasr",
    arabicName: "النصر",
    ayahs: [
      { arabic: "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ", transliteration: "Itha ja-a nasrullahi wal-fath", translation: "When the victory of Allah has come and the conquest," },
      { arabic: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", transliteration: "Wa ra-aytan-nasa yadkhuloona fee deenillahi afwaja", translation: "And you see the people entering into the religion of Allah in multitudes," },
      { arabic: "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا", transliteration: "Fasabbih bihamdi rabbika wastaghfirhu innahu kana tawwaba", translation: "Then exalt [Allah] with praise of your Lord and ask forgiveness of Him. Indeed, He is ever Accepting of repentance." }
    ],
    reflection: "The response to success and victory here isn't celebration — it's more praise and more asking for forgiveness. A check on how you handle your own wins."
  }
];

export function monthlySurah(month: Date): SurahEntry {
  const index = month.getFullYear() * 12 + month.getMonth();
  return SURAHS[((index % SURAHS.length) + SURAHS.length) % SURAHS.length];
}

export function quranComUrl(slug: string): string {
  return `https://quran.com/${slug}`;
}
