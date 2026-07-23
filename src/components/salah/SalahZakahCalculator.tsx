import { useEffect, useState } from "react";
import { calculateZakah } from "../../lib/zakah";
import type { NisabBasis, ZakahInput } from "../../lib/zakah";

const STORAGE_KEY = "salah-zakah-input";

const DEFAULT_INPUT: ZakahInput = {
  cash: 0,
  goldGrams: 0,
  silverGrams: 0,
  investments: 0,
  liabilities: 0,
  goldPricePerGram: 0,
  silverPricePerGram: 0,
  nisabBasis: "silver"
};

function loadStored(): ZakahInput {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INPUT;
    return { ...DEFAULT_INPUT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INPUT;
  }
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        className="w-full rounded-xl border border-white/10 bg-surface-high px-3 py-2.5 text-sm text-on-surface"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

export function SalahZakahCalculator() {
  const [input, setInput] = useState<ZakahInput>(loadStored);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  function set<K extends keyof ZakahInput>(key: K, value: ZakahInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const result = calculateZakah(input);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <h3 className="mb-1 text-lg font-bold text-on-surface">Zakah calculator</h3>
      <p className="mb-4 text-xs text-on-surface-dim">
        A simple estimate — cash, gold/silver, investments, minus short-term debts, times 2.5%.
        All numbers stay on your device. Not a fatwa — for anything unusual (business assets,
        mixed currencies, debts owed to you), check with someone knowledgeable.
      </p>

      <div className="space-y-4">
        <NumberField label="Cash on hand & in accounts" value={input.cash} onChange={(v) => set("cash", v)} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Gold (grams)" value={input.goldGrams} onChange={(v) => set("goldGrams", v)} />
          <NumberField
            label="Gold price/gram"
            value={input.goldPricePerGram}
            onChange={(v) => set("goldPricePerGram", v)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Silver (grams)" value={input.silverGrams} onChange={(v) => set("silverGrams", v)} />
          <NumberField
            label="Silver price/gram"
            value={input.silverPricePerGram}
            onChange={(v) => set("silverPricePerGram", v)}
          />
        </div>
        <NumberField
          label="Investments (stocks, crypto, etc.)"
          value={input.investments}
          onChange={(v) => set("investments", v)}
        />
        <NumberField
          label="Short-term debts owed"
          value={input.liabilities}
          onChange={(v) => set("liabilities", v)}
        />

        <div>
          <span className="mb-1 block text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
            Nisab basis
          </span>
          <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/5 bg-black/20 p-1">
            {(["silver", "gold"] as const).map((b: NisabBasis) => (
              <button
                key={b}
                className={`rounded-full py-2 text-center text-[11px] font-extrabold tracking-widest uppercase transition-colors duration-200 ${
                  input.nisabBasis === b ? "bg-primary text-on-primary" : "text-on-surface-dim"
                }`}
                onClick={() => set("nisabBasis", b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-4">
        <p className="text-[11px] font-extrabold tracking-widest text-on-surface-dim uppercase">
          Zakatable wealth
        </p>
        <p className="mt-1 text-2xl font-extrabold text-on-surface">
          {result.zakatableWealth.toFixed(2)}
        </p>
        <p className="mt-2 text-xs text-on-surface-dim">Nisab threshold: {result.nisabValue.toFixed(2)}</p>
        {result.aboveNisab ? (
          <p className="mt-3 text-sm font-bold text-primary">Zakah due: {result.dueAmount.toFixed(2)}</p>
        ) : (
          <p className="mt-3 text-sm text-on-surface-dim">Below nisab — no zakah due on this estimate.</p>
        )}
      </div>
    </div>
  );
}
