import type { Complexity } from "@prisma/client";

/**
 * Mesin harga — murni, deterministik, dan TIDAK PERNAH disentuh AI (§3, §4 PRD).
 * AI hanya memasok `complexity`; angka rupiah ditentukan di sini dari pricing rules user.
 */

export type PriceRules = Partial<Record<Complexity, number>>;

/** Dipakai hanya jika workspace belum punya pricing rule untuk complexity tersebut (§2). */
export const DEFAULT_RULES: PriceRules = {
  SIMPLE: 100_000,
  MEDIUM: 200_000,
  COMPLEX: 300_000,
};

export interface PricedTask {
  complexity: Complexity;
  customEstimateMin?: number | null;
  customEstimateMax?: number | null;
}

export interface TaskPrice {
  /** Angka tunggal yang dipakai untuk total base. Untuk Very Complex = batas bawah range. */
  price: number;
  priceMin?: number;
  priceMax?: number;
  isRange: boolean;
}

export class PricingError extends Error {}

export function priceTask(task: PricedTask, rules: PriceRules = DEFAULT_RULES): TaskPrice {
  if (task.complexity === "VERY_COMPLEX") {
    const { customEstimateMin: min, customEstimateMax: max } = task;

    // Very Complex wajib punya range — jangan pernah dipaksa jadi angka tunggal (§2).
    if (min == null || max == null) {
      throw new PricingError(
        "Task Very Complex wajib memiliki custom_estimate_min dan custom_estimate_max",
      );
    }
    if (min > max) {
      throw new PricingError("custom_estimate_min tidak boleh lebih besar dari custom_estimate_max");
    }

    return { price: min, priceMin: min, priceMax: max, isRange: true };
  }

  const price = rules[task.complexity] ?? DEFAULT_RULES[task.complexity];
  if (price == null) {
    throw new PricingError(`Tidak ada pricing rule untuk complexity ${task.complexity}`);
  }

  return { price, isRange: false };
}

export interface Total {
  base: number;
  customMin: number;
  customMax: number;
}

/** Base dan custom range dijumlahkan terpisah agar quotation bisa menampilkan range (§2). */
export function totalPrice(tasks: PricedTask[], rules: PriceRules = DEFAULT_RULES): Total {
  return tasks.reduce<Total>(
    (acc, task) => {
      const priced = priceTask(task, rules);
      if (priced.isRange) {
        acc.customMin += priced.priceMin!;
        acc.customMax += priced.priceMax!;
      } else {
        acc.base += priced.price;
      }
      return acc;
    },
    { base: 0, customMin: 0, customMax: 0 },
  );
}
