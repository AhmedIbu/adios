import { useEffect, useState } from "react";
import type { QuranSurah } from "../../lib/content/quran";
import { loadSurah, monthlySurahNumber, quranComUrl } from "../../lib/content/quran";

type Status = "loading" | "error" | "ready";

export function SalahSurahOfMonth() {
  const number = monthlySurahNumber(new Date());
  const [status, setStatus] = useState<Status>("loading");
  const [surah, setSurah] = useState<QuranSurah | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSurah(null);
    loadSurah(number)
      .then((s) => {
        if (!cancelled) {
          setSurah(s);
          setStatus("ready");
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [number]);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-secondary uppercase">
        Surah of the month
      </p>

      {status === "loading" && (
        <p className="py-8 text-center text-sm text-on-surface-dim">Loading from Al Quran Cloud…</p>
      )}

      {status === "error" && (
        <div className="py-6 text-center">
          <p className="text-sm text-on-surface-dim">
            Couldn't load this month's surah — check your connection.
          </p>
          <a
            href={quranComUrl(number)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-secondary"
          >
            Read it on Quran.com instead
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        </div>
      )}

      {status === "ready" && surah && (
        <>
          <h3 className="mb-3 text-lg font-bold text-on-surface">
            {surah.englishName}{" "}
            <span className="font-normal text-on-surface-dim">
              · {surah.name} · {surah.englishNameTranslation}
            </span>
          </h3>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {surah.ayahs.map((a) => (
              <div key={a.number} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <p dir="rtl" className="mb-1 text-right text-xl leading-loose text-on-surface">
                  {a.arabic}
                  <span className="mx-1 text-sm text-on-surface-dim">﴿{a.number}﴾</span>
                </p>
                <p className="text-xs italic text-on-surface-dim">{a.transliteration}</p>
                <p className="mt-1 text-sm text-on-surface">{a.translation}</p>
              </div>
            ))}
          </div>
          <a
            href={quranComUrl(surah.number)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-secondary"
          >
            Read full tafsir on Quran.com
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
          <p className="mt-3 text-[10px] text-on-surface-dim/60">
            Text via Al Quran Cloud (Uthmani script, transliteration, Saheeh International).
          </p>
        </>
      )}
    </div>
  );
}
