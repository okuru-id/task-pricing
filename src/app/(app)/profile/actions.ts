"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const brandingSchema = z.object({
  companyName: optional(200),
  address: optional(500),
  contact: optional(300),
  bankInfo: optional(500),
  terms: optional(3000),
});

export type BrandingInput = z.input<typeof brandingSchema>;

/** Identitas yang tampil di header, pembayaran, dan syarat pada PDF penawaran (§2 Quotation). */
export async function saveBranding(input: BrandingInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.workspace.update({ where: { id: workspaceId }, data: parsed.data });

  revalidatePath("/profile");
  return { ok: true };
}
