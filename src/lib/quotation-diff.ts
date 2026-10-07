import type { Complexity } from "@prisma/client";

/** Perbandingan dua versi quotation (§5 v1.1: quotation versioning + diff). Murni — tanpa DB. */

export interface DiffItem {
  name: string;
  complexity: Complexity | null;
  price: number;
  priceMax: number | null;
}

export interface DiffQuotation {
  total: number;
  totalMax: number | null;
  assumptions: string[];
  exclusions: string[];
  items: DiffItem[];
}

export interface ChangedItem {
  name: string;
  before: DiffItem;
  after: DiffItem;
}

export interface TextDiff {
  added: string[];
  removed: string[];
}

export interface QuotationDiff {
  added: DiffItem[];
  removed: DiffItem[];
  changed: ChangedItem[];
  unchanged: number;
  /** Selisih batas bawah dan batas atas total (after − before). Sama jika tidak ada range. */
  deltaMin: number;
  deltaMax: number;
  assumptions: TextDiff;
  exclusions: TextDiff;
  hasChanges: boolean;
}

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Item tidak punya id stabil antar versi (snapshot dibuat ulang), jadi dicocokkan lewat nama.
 * Nama kembar dibedakan dengan urutan kemunculan, sehingga tidak saling menimpa.
 */
function keyed(items: DiffItem[]): Map<string, DiffItem> {
  const seen = new Map<string, number>();
  const map = new Map<string, DiffItem>();

  for (const item of items) {
    const base = norm(item.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    map.set(`${base}#${n}`, item);
  }
  return map;
}

function textDiff(before: string[], after: string[]): TextDiff {
  const b = new Set(before.map(norm));
  const a = new Set(after.map(norm));
  return {
    added: after.filter((text) => !b.has(norm(text))),
    removed: before.filter((text) => !a.has(norm(text))),
  };
}

const same = (x: DiffItem, y: DiffItem) =>
  x.price === y.price && x.priceMax === y.priceMax && x.complexity === y.complexity;

export function diffQuotations(before: DiffQuotation, after: DiffQuotation): QuotationDiff {
  const b = keyed(before.items);
  const a = keyed(after.items);

  const added: DiffItem[] = [];
  const removed: DiffItem[] = [];
  const changed: ChangedItem[] = [];
  let unchanged = 0;

  for (const [key, item] of a) {
    const old = b.get(key);
    if (!old) added.push(item);
    else if (same(old, item)) unchanged++;
    else changed.push({ name: item.name, before: old, after: item });
  }
  for (const [key, item] of b) {
    if (!a.has(key)) removed.push(item);
  }

  const assumptions = textDiff(before.assumptions, after.assumptions);
  const exclusions = textDiff(before.exclusions, after.exclusions);

  const deltaMin = after.total - before.total;
  const deltaMax = (after.totalMax ?? after.total) - (before.totalMax ?? before.total);

  return {
    added,
    removed,
    changed,
    unchanged,
    deltaMin,
    deltaMax,
    assumptions,
    exclusions,
    hasChanges:
      added.length + removed.length + changed.length > 0 ||
      assumptions.added.length + assumptions.removed.length + exclusions.added.length + exclusions.removed.length > 0 ||
      deltaMin !== 0 ||
      deltaMax !== 0,
  };
}
