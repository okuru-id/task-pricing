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

/** Profile + versi rule terbaru yang dipakai sebagai acuan snapshot quotation (§2). */
export async function getPricingProfileRef(workspaceId: string) {
  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, rules: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } },
  });

  return profile ? { id: profile.id, version: profile.rules[0]?.version ?? 1 } : null;
}
