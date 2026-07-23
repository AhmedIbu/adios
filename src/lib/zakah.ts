export type NisabBasis = "gold" | "silver";

export interface ZakahInput {
  cash: number;
  goldGrams: number;
  silverGrams: number;
  investments: number;
  liabilities: number;
  goldPricePerGram: number;
  silverPricePerGram: number;
  nisabBasis: NisabBasis;
}

export interface ZakahResult {
  zakatableWealth: number;
  nisabValue: number;
  aboveNisab: boolean;
  dueAmount: number;
}

const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;
const ZAKAH_RATE = 0.025;

/**
 * A simple estimate covering cash, gold/silver holdings, and investments,
 * minus short-term liabilities — not a substitute for scholarly guidance on
 * business zakah, agricultural zakah, or mixed-asset edge cases.
 */
export function calculateZakah(input: ZakahInput): ZakahResult {
  const goldValue = input.goldGrams * input.goldPricePerGram;
  const silverValue = input.silverGrams * input.silverPricePerGram;
  const totalAssets = input.cash + goldValue + silverValue + input.investments;
  const zakatableWealth = Math.max(0, totalAssets - input.liabilities);

  const nisabValue =
    input.nisabBasis === "gold"
      ? NISAB_GOLD_GRAMS * input.goldPricePerGram
      : NISAB_SILVER_GRAMS * input.silverPricePerGram;

  const aboveNisab = nisabValue > 0 && zakatableWealth >= nisabValue;
  const dueAmount = aboveNisab ? zakatableWealth * ZAKAH_RATE : 0;

  return { zakatableWealth, nisabValue, aboveNisab, dueAmount };
}
