import { describe, expect, it } from "vitest";

import { PricingError } from "./pricing-engine";
import {
  buildExclusions,
  buildSnapshot,
  formatCustomerSummary,
  groupByType,
  type QuotableTask,
} from "./quotation";

const task = (over: Partial<QuotableTask> = {}): QuotableTask => ({
  name: "Login",
  type: "NEW_FEATURE",
  complexity: "SIMPLE",
  customEstimateMin: null,
  customEstimateMax: null,
  breakdown: [],
  flags: [],
  ...over,
});

const rules = { SIMPLE: 150_000, MEDIUM: 250_000, COMPLEX: 400_000 };

describe("buildSnapshot", () => {
  it("memakai pricing rules, bukan angka lain, dan menjumlah total", () => {
    const snap = buildSnapshot([task(), task({ complexity: "MEDIUM" })], rules);
    expect(snap.items.map((i) => i.price)).toEqual([150_000, 250_000]);
    expect(snap.total).toBe(400_000);
    expect(snap.totalMax).toBeNull();
  });

  it("menghasilkan range total jika ada Very Complex", () => {
    const snap = buildSnapshot(
      [task(), task({ complexity: "VERY_COMPLEX", customEstimateMin: 1_000_000, customEstimateMax: 2_000_000 })],
      rules,
    );
    expect(snap.total).toBe(1_150_000);
    expect(snap.totalMax).toBe(2_150_000);
    expect(snap.items[1].priceMax).toBe(2_000_000);
  });

  it("menolak Very Complex tanpa range dan daftar kosong", () => {
    expect(() => buildSnapshot([task({ complexity: "VERY_COMPLEX" })], rules)).toThrow(PricingError);
    expect(() => buildSnapshot([], rules)).toThrow(PricingError);
  });
});

describe("buildExclusions", () => {
  it("menambah pengecualian dari flag tanpa duplikat", () => {
    const result = buildExclusions([
      { flags: ["THIRD_PARTY_DEPENDENCY"] },
      { flags: ["THIRD_PARTY_DEPENDENCY", "DATA_MIGRATION"] },
    ]);
    expect(result.filter((e) => e.includes("pihak ketiga"))).toHaveLength(1);
    expect(result.some((e) => e.includes("migrasi"))).toBe(true);
  });
});

describe("groupByType", () => {
  it("memberi subtotal per tipe, termasuk range", () => {
    const groups = groupByType([
      { type: "BUG" as const, price: 100, priceMax: null },
      { type: "BUG" as const, price: 200, priceMax: 300 },
      { type: "NEW_FEATURE" as const, price: 50, priceMax: null },
    ]);
    expect(groups[0]).toMatchObject({ type: "BUG", subtotal: 300, subtotalMax: 400 });
    expect(groups[1]).toMatchObject({ type: "NEW_FEATURE", subtotal: 50, subtotalMax: null });
  });
});

describe("formatCustomerSummary", () => {
  it("tidak memuat istilah teknis", () => {
    const text = formatCustomerSummary({
      clientName: "Budi",
      projectName: "Toko Online",
      items: [{ name: "Login", price: 100_000, priceMax: null }],
      total: 100_000,
      totalMax: null,
      assumptions: ["Desain disediakan klien"],
      exclusions: ["Biaya hosting"],
    });
    expect(text).toContain("Halo Budi,");
    expect(text).toContain("• Login");
    expect(text).toContain("Asumsi");
    expect(text).not.toMatch(/complex|simple|flag|enhancement/i);
  });
});
