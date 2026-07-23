import { monthlySurah, quranComUrl } from "../../lib/content/surahs";

export function SalahSurahOfMonth() {
  const surah = monthlySurah(new Date());

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-secondary uppercase">
        Surah of the month
      </p>
      <h3 className="mb-3 text-lg font-bold text-on-surface">
        {surah.name} <span className="font-normal text-on-surface-dim">· {surah.arabicName}</span>
      </h3>
      <div className="space-y-3">
        {surah.ayahs.map((a, i) => (
          <div key={i} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <p dir="rtl" className="mb-1 text-right text-xl leading-loose text-on-surface">
              {a.arabic}
            </p>
            <p className="text-xs italic text-on-surface-dim">{a.transliteration}</p>
            <p className="mt-1 text-sm text-on-surface">{a.translation}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-on-surface-dim">{surah.reflection}</p>
      <a
        href={quranComUrl(surah.slug)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-secondary"
      >
        Read full tafsir on Quran.com
        <span className="material-symbols-outlined text-sm">open_in_new</span>
      </a>
    </div>
  );
}
