import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, PricingError, priceTask, totalPrice } from "./pricing-engine";

describe("priceTask", () => {
  it("memakai harga default per complexity", () => {
    expect(priceTask({ complexity: "SIMPLE" }).price).toBe(100_000);
    expect(priceTask({ complexity: "MEDIUM" }).price).toBe(200_000);
    expect(priceTask({ complexity: "COMPLEX" }).price).toBe(300_000);
  });

  it("memakai pricing rules workspace, bukan default", () => {
    const rules = { SIMPLE: 150_000, MEDIUM: 300_000, COMPLEX: 500_000 };
    expect(priceTask({ complexity: "COMPLEX" }, rules).price).toBe(500_000);
  });

  it("jatuh ke default jika rule untuk complexity itu belum diisi", () => {
    expect(priceTask({ complexity: "MEDIUM" }, { SIMPLE: 150_000 }).price).toBe(
      DEFAULT_RULES.MEDIUM,
    );
  });

  it("mengembalikan range untuk Very Complex", () => {
    const result = priceTask({
      complexity: "VERY_COMPLEX",
      customEstimateMin: 1_000_000,
      customEstimateMax: 2_000_000,
    });

    expect(result).toMatchObject({ isRange: true, priceMin: 1_000_000, priceMax: 2_000_000 });
  });

  it("menolak Very Complex tanpa custom range — tidak boleh dipaksa jadi Rp300K", () => {
    expect(() => priceTask({ complexity: "VERY_COMPLEX" })).toThrow(PricingError);
    expect(() =>
      priceTask({ complexity: "VERY_COMPLEX", customEstimateMin: 1_000_000 }),
    ).toThrow(PricingError);
  });

  it("menolak range terbalik", () => {
    expect(() =>
      priceTask({
        complexity: "VERY_COMPLEX",
        customEstimateMin: 2_000_000,
        customEstimateMax: 1_000_000,
      }),
    ).toThrow(PricingError);
  });
});

describe("totalPrice", () => {
  it("menjumlahkan base dan custom range secara terpisah", () => {
    const total = totalPrice([
      { complexity: "SIMPLE" },
      { complexity: "MEDIUM" },
      { complexity: "COMPLEX" },
      { complexity: "VERY_COMPLEX", customEstimateMin: 1_000_000, customEstimateMax: 2_000_000 },
    ]);

    expect(total).toEqual({ base: 600_000, customMin: 1_000_000, customMax: 2_000_000 });
  });

  it("mengembalikan nol untuk daftar kosong", () => {
    expect(totalPrice([])).toEqual({ base: 0, customMin: 0, customMax: 0 });
  });
});
