"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  SIMPLE: z.number().int("Harga harus bilangan bulat").positive("Harga harus lebih dari 0"),
  MEDIUM: z.number().int("Harga harus bilangan bulat").positive("Harga harus lebih dari 0"),
  COMPLEX: z.number().int("Harga harus bilangan bulat").positive("Harga harus lebih dari 0"),
});

export type PricingInput = z.infer<typeof schema>;

/**
 * Menyimpan harga sebagai versi rule BARU (bukan menimpa) — quotation lama
 * tetap menunjuk versi yang dipakainya lewat snapshot (§2 Pricing Profiles).
 */
export async function savePricing(input: PricingInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { SIMPLE, MEDIUM, COMPLEX } = parsed.data;
  if (!(SIMPLE <= MEDIUM && MEDIUM <= COMPLEX)) {
    return { ok: false, error: "Harga harus naik: Simple ≤ Medium ≤ Complex" };
  }

  const profile = await prisma.pricingProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, rules: { select: { version: true }, orderBy: { version: "desc" }, take: 1 } },
  });
  if (!profile) return { ok: false, error: "Pricing profile tidak ditemukan" };

  const version = (profile.rules[0]?.version ?? 0) + 1;
  await prisma.pricingRule.createMany({
    data: (Object.entries(parsed.data) as [keyof PricingInput, number][]).map(([complexity, price]) => ({
      pricingProfileId: profile.id,
      complexity,
      price,
      version,
    })),
  });

  revalidatePath("/pricing");
  return { ok: true };
}
