import { weeklyDua } from "../../lib/content/duas";
import { toDayString } from "../../lib/salah";

export function SalahDuaOfWeek() {
  const todayStr = toDayString(new Date());
  const featured = weeklyDua(todayStr);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <p className="mb-1 text-[11px] font-extrabold tracking-widest text-primary uppercase">
        Dua of the week
      </p>
      <h3 className="mb-2 text-base font-bold text-on-surface">{featured.title}</h3>
      <p dir="rtl" className="mb-2 text-right text-xl leading-loose text-on-surface">
        {featured.arabic}
      </p>
      <p className="text-sm italic text-on-surface-dim">{featured.transliteration}</p>
      <p className="mt-1 text-sm text-on-surface">{featured.translation}</p>
      <p className="mt-1 text-[10px] font-bold tracking-widest text-on-surface-dim/60 uppercase">
        {featured.source}
      </p>
    </div>
  );
}
