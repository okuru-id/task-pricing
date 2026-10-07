import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES, type PriceRules } from "@/lib/pricing-engine";

/** Ambil pricing rules versi terbaru dari profile default workspace (§2 Pricing Profiles). */
export async function getPriceRules(workspaceId: string): Promise<PriceRules> {
  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      rules: {
        orderBy: { version: "desc" },
        select: { complexity: true, price: true, version: true },
      },
    },
  });

  if (!profile) return DEFAULT_RULES;

  const rules: PriceRules = {};
  for (const rule of profile.rules) {
    // rules sudah urut version desc — entri pertama per complexity adalah yang terbaru.
    rules[rule.complexity] ??= rule.price;
  }

  return { ...DEFAULT_RULES, ...rules };
}

export interface PricingVersion {
  version: number;
  changedAt: Date;
  rules: PriceRules;
}

/**
 * Riwayat perubahan harga per versi. Penawaran lama memakai harga saat dibuat, jadi versi lama
 * tetap relevan untuk menjelaskan kenapa dua penawaran berbeda angkanya.
 */
export async function getPricingHistory(workspaceId: string): Promise<PricingVersion[]> {
  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      rules: {
        orderBy: { version: "desc" },
        select: { complexity: true, price: true, version: true, createdAt: true },
      },
    },
  });

  if (!profile) return [];

  const byVersion = new Map<number, PricingVersion>();
  for (const rule of profile.rules) {
    const entry = byVersion.get(rule.version) ?? {
      version: rule.version,
      changedAt: rule.createdAt,
      rules: {} as PriceRules,
    };
    entry.rules[rule.complexity] ??= rule.price;
    // Satu versi ditulis sekaligus; pakai stempel paling awal sebagai waktu perubahan.
    if (rule.createdAt < entry.changedAt) entry.changedAt = rule.createdAt;
    byVersion.set(rule.version, entry);
  }

  return [...byVersion.values()].sort((a, b) => b.version - a.version);
}

/** Profile + versi rule terbaru yang dipakai sebagai acuan snapshot quotation (§2). */
export async function getPricingProfileRef(workspaceId: string) {
  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, rules: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } },
  });

  return profile ? { id: profile.id, version: profile.rules[0]?.version ?? 1 } : null;
}
