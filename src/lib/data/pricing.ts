import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES, type PriceRules } from "@/lib/pricing-engine";

const rulesOf = (rows: { complexity: keyof PriceRules; price: number }[]): PriceRules => {
  const rules: PriceRules = {};
  for (const rule of rows) {
    // rows sudah urut version desc — entri pertama per complexity adalah yang terbaru.
    rules[rule.complexity] ??= rule.price;
  }
  return { ...DEFAULT_RULES, ...rules };
};

const ruleSelect = {
  orderBy: { version: "desc" },
  select: { complexity: true, price: true, version: true },
} as const;

/**
 * Tarif satu profil harga tertentu, selalu diperiksa kepemilikannya terhadap workspace (§4).
 * Profil yang bukan milik workspace, atau id kosong, jatuh ke profil default workspace —
 * lebih baik memakai tarif yang sah daripada menolak menghitung harga.
 */
export async function getPriceRulesFor(
  workspaceId: string,
  pricingProfileId?: string | null,
): Promise<PriceRules> {
  if (pricingProfileId) {
    const chosen = await prisma.pricingProfile.findFirst({
      where: { id: pricingProfileId, workspaceId },
      select: { rules: ruleSelect },
    });
    if (chosen) return rulesOf(chosen.rules);
  }

  return getPriceRules(workspaceId);
}

/** Ambil pricing rules versi terbaru dari profile default workspace (§2 Pricing Profiles). */
export async function getPriceRules(workspaceId: string): Promise<PriceRules> {
  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { rules: ruleSelect },
  });

  if (!profile) return DEFAULT_RULES;
  return rulesOf(profile.rules);
}

/** Daftar profil harga untuk dikelola dan dipilih saat input estimasi. */
export async function listPricingProfiles(workspaceId: string) {
  const profiles = await prisma.pricingProfile.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isDefault: true,
      rules: ruleSelect,
      _count: { select: { projects: true } },
    },
  });

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    isDefault: profile.isDefault,
    projectCount: profile._count.projects,
    rules: rulesOf(profile.rules),
  }));
}

export type PricingProfileView = Awaited<ReturnType<typeof listPricingProfiles>>[number];

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
