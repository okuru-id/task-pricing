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

const aiSchema = z.object({
  provider: z.enum(["openai", "ollama"]),
  model: z.string().trim().min(1, "Model wajib diisi").max(200),
  temperature: z.number().min(0, "Temperature minimal 0").max(2, "Temperature maksimal 2"),
  systemPrompt: optional(4000),
});

export type AiSettingsInput = z.input<typeof aiSchema>;

export async function saveAiSettings(input: AiSettingsInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = aiSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // getAiSettings memakai config terbaru; baris lama dibiarkan sebagai riwayat.
  await prisma.aiConfig.create({ data: { workspaceId, ...parsed.data } });

  revalidatePath("/settings");
  return { ok: true };
}

const brandingSchema = z.object({
  companyName: optional(200),
  address: optional(500),
  contact: optional(300),
  bankInfo: optional(500),
  terms: optional(3000),
});

export type BrandingInput = z.input<typeof brandingSchema>;

export async function saveBranding(input: BrandingInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.workspace.update({ where: { id: workspaceId }, data: parsed.data });

  revalidatePath("/settings");
  return { ok: true };
}
