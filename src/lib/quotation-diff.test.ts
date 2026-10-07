import { describe, expect, it } from "vitest";

import { diffQuotations, type DiffItem, type DiffQuotation } from "./quotation-diff";

const item = (name: string, price: number, over: Partial<DiffItem> = {}): DiffItem => ({
  name,
  complexity: "MEDIUM",
  price,
  priceMax: null,
  ...over,
});

const quote = (items: DiffItem[], over: Partial<DiffQuotation> = {}): DiffQuotation => ({
  total: items.reduce((s, i) => s + i.price, 0),
  totalMax: null,
  assumptions: [],
  exclusions: [],
  items,
  ...over,
});

describe("diffQuotations", () => {
  it("tidak ada perubahan untuk versi identik", () => {
    const q = quote([item("Login", 100), item("Dashboard", 200)]);
    const diff = diffQuotations(q, q);
    expect(diff).toMatchObject({ added: [], removed: [], changed: [], unchanged: 2, deltaMin: 0, hasChanges: false });
  });

  it("mendeteksi item baru, dihapus, dan berubah harga/kompleksitas", () => {
    const before = quote([item("Login", 100), item("Dashboard", 200), item("Laporan", 300)]);
    const after = quote([item("login", 150), item("Dashboard", 200, { complexity: "COMPLEX" }), item("Notifikasi", 50)]);

    const diff = diffQuotations(before, after);
    expect(diff.added.map((i) => i.name)).toEqual(["Notifikasi"]);
    expect(diff.removed.map((i) => i.name)).toEqual(["Laporan"]);
    expect(diff.changed.map((c) => c.name)).toEqual(["login", "Dashboard"]);
    expect(diff.deltaMin).toBe(400 - 600);
    expect(diff.hasChanges).toBe(true);
  });

  it("nama kembar dicocokkan berdasarkan urutan, tidak saling menimpa", () => {
    const before = quote([item("Fix bug", 100), item("Fix bug", 200)]);
    const after = quote([item("Fix bug", 100), item("Fix bug", 250)]);
    const diff = diffQuotations(before, after);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].before.price).toBe(200);
    expect(diff.unchanged).toBe(1);
  });

  it("selisih total memperhitungkan range Very Complex", () => {
    const before = quote([item("A", 100)]);
    const after = quote([item("A", 100), item("B", 1000, { complexity: "VERY_COMPLEX", priceMax: 2000 })], {
      total: 1100,
      totalMax: 2100,
    });
    const diff = diffQuotations(before, after);
    expect(diff.deltaMin).toBe(1000);
    expect(diff.deltaMax).toBe(2000);
  });

  it("membandingkan asumsi dan pengecualian tanpa peduli huruf/spasi", () => {
    const diff = diffQuotations(
      quote([], { assumptions: ["Desain  disediakan klien", "Lama"], exclusions: ["Hosting"] }),
      quote([], { assumptions: ["desain disediakan klien", "Baru"], exclusions: ["Hosting", "Domain"] }),
    );
    expect(diff.assumptions).toEqual({ added: ["Baru"], removed: ["Lama"] });
    expect(diff.exclusions).toEqual({ added: ["Domain"], removed: [] });
  });
});
