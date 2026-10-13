import type { Complexity, TaskFlag } from "@prisma/client";

import { formatIDR, formatRange } from "@/lib/format";
import { taskTypeLabel, type TaskTypeLabels } from "@/lib/labels";
import { PricingError, priceTask, type PriceRules } from "@/lib/pricing-engine";

export interface QuotableTask {
  name: string;
  type: string;
  complexity: Complexity;
  customEstimateMin: number | null;
  customEstimateMax: number | null;
  breakdown: string[];
  flags: TaskFlag[];
}

export interface SnapshotItem {
  name: string;
  type: string;
  complexity: Complexity;
  breakdown: string[];
  price: number;
  priceMax: number | null;
  order: number;
}

export interface QuotationSnapshot {
  items: SnapshotItem[];
  total: number;
  totalMax: number | null;
  exclusions: string[];
}

/** Pengecualian dasar yang selalu tampil agar ekspektasi pelanggan jelas (§2 Quotation). */
const BASE_EXCLUSIONS = [
  "Perubahan atau penambahan fitur di luar daftar pekerjaan pada penawaran ini",
  "Biaya hosting, domain, dan lisensi perangkat lunak",
];

const FLAG_EXCLUSIONS: Partial<Record<TaskFlag, string>> = {
  THIRD_PARTY_DEPENDENCY: "Biaya layanan atau API pihak ketiga",
  DATA_MIGRATION: "Pembersihan data lama yang tidak konsisten sebelum migrasi",
};

export function buildExclusions(tasks: Pick<QuotableTask, "flags">[]): string[] {
  const flagged = new Set<string>();
  for (const task of tasks) {
    for (const flag of task.flags) {
      const text = FLAG_EXCLUSIONS[flag];
      if (text) flagged.add(text);
    }
  }
  return [...BASE_EXCLUSIONS, ...flagged];
}

/**
 * Membekukan harga dari pricing rules saat ini. Harga dihitung ulang oleh engine
 * (bukan dipercaya dari kolom task) sehingga snapshot selalu konsisten dengan profile.
 * Very Complex tanpa range → PricingError, quotation tidak boleh dibuat.
 */
export function buildSnapshot(tasks: QuotableTask[], rules: PriceRules): QuotationSnapshot {
  if (tasks.length === 0) throw new PricingError("Tidak ada tugas untuk ditawarkan");

  let total = 0;
  let totalMax = 0;

  const items = tasks.map((task, order): SnapshotItem => {
    const priced = priceTask(task, rules);
    total += priced.price;
    totalMax += priced.priceMax ?? priced.price;

    return {
      name: task.name,
      type: task.type,
      complexity: task.complexity,
      breakdown: task.breakdown,
      price: priced.price,
      priceMax: priced.isRange ? priced.priceMax! : null,
      order,
    };
  });

  return {
    items,
    total,
    totalMax: totalMax > total ? totalMax : null,
    exclusions: buildExclusions(tasks),
  };
}

export function formatItemPrice(item: { price: number; priceMax: number | null }): string {
  return item.priceMax != null ? formatRange(item.price, item.priceMax) : formatIDR(item.price);
}

export function formatTotal(quotation: { total: number; totalMax: number | null }): string {
  return formatItemPrice({ price: quotation.total, priceMax: quotation.totalMax });
}

export interface TypeGroup<T> {
  type: string;
  label: string;
  items: T[];
  subtotal: number;
  subtotalMax: number | null;
}

/** Mode Summary: item dikelompokkan per tipe pekerjaan dengan subtotal. */
export function groupByType<T extends { type: string | null; price: number; priceMax: number | null }>(
  items: T[],
  labels?: TaskTypeLabels,
): TypeGroup<T>[] {
  const groups = new Map<string, TypeGroup<T>>();

  for (const item of items) {
    // Item tanpa tipe (snapshot lama) dikelompokkan terpisah, bukan dipaksa jadi tipe software.
    const type = item.type ?? "lainnya";
    const group = groups.get(type) ?? {
      type,
      label: taskTypeLabel(type, labels),
      items: [],
      subtotal: 0,
      subtotalMax: null,
    };

    group.items.push(item);
    group.subtotal += item.price;
    if (item.priceMax != null || group.subtotalMax != null) {
      group.subtotalMax = (group.subtotalMax ?? group.subtotal - item.price) + (item.priceMax ?? item.price);
    }
    groups.set(type, group);
  }

  return [...groups.values()];
}

/** Teks WhatsApp bahasa Indonesia — tanpa istilah teknis (complexity, tipe, flag) (§2 US). */
export function formatCustomerSummary(input: {
  clientName: string | null;
  projectName: string;
  items: { name: string; price: number; priceMax: number | null }[];
  total: number;
  totalMax: number | null;
  assumptions: string[];
  exclusions: string[];
}): string {
  const lines: string[] = [];

  lines.push(input.clientName ? `Halo ${input.clientName},` : "Halo,");
  lines.push(`Berikut estimasi biaya untuk *${input.projectName}*:`);
  lines.push("");
  lines.push(...input.items.map((item) => `• ${item.name} — ${formatItemPrice(item)}`));
  lines.push("");
  lines.push(`*Total estimasi: ${formatTotal(input)}*`);

  if (input.totalMax != null) {
    lines.push("_Sebagian pekerjaan berupa rentang harga karena cakupannya masih perlu dipastikan._");
  }
  if (input.assumptions.length > 0) {
    lines.push("", "*Asumsi:*", ...input.assumptions.map((a) => `• ${a}`));
  }
  if (input.exclusions.length > 0) {
    lines.push("", "*Tidak termasuk:*", ...input.exclusions.map((e) => `• ${e}`));
  }

  lines.push("", "Silakan kabari kami jika ada yang ingin didiskusikan. Terima kasih 🙏");
  return lines.join("\n");
}
