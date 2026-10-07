"use server";

import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { z } from "zod";

import { OLLAMA_DEFAULT_BASE_URL, keyHint, validateBaseUrl } from "@/lib/ai/config";
import { AiConfigError, requireAiSettings, resolveModel } from "@/lib/ai/provider";
import { SecretError, encryptSecret } from "@/lib/crypto";
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
  systemPrompt: optional(4000).optional(),
  baseUrl: optional(500).optional(),
  /** Kosong = pertahankan key yang tersimpan. */
  apiKey: z.string().trim().max(500).optional(),
  clearKey: z.boolean().optional(),
});

export type AiSettingsInput = z.input<typeof aiSchema>;

/**
 * Simpan konfigurasi AI workspace (BYOK). API key dienkripsi sebelum masuk database dan tidak pernah
 * dikembalikan ke klien. Satu baris per workspace — diperbarui di tempat.
 */
export async function saveAiSettings(input: AiSettingsInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = aiSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { apiKey, clearKey, baseUrl: rawBaseUrl, ...rest } = parsed.data;

  let baseUrl: string | null = null;
  if (rawBaseUrl) {
    const checked = validateBaseUrl(rawBaseUrl);
    if (!checked.ok) return { ok: false, error: checked.error };
    baseUrl = checked.url;
  }
  if (rest.provider === "ollama" && !baseUrl) baseUrl = OLLAMA_DEFAULT_BASE_URL;

  const existing = await prisma.aiConfig.findFirst({ where: { workspaceId }, orderBy: { createdAt: "desc" } });

  let keyData: { apiKeyEnc: string | null; apiKeyHint: string | null };
  try {
    if (apiKey) keyData = { apiKeyEnc: encryptSecret(apiKey), apiKeyHint: keyHint(apiKey) };
    else if (clearKey) keyData = { apiKeyEnc: null, apiKeyHint: null };
    else keyData = { apiKeyEnc: existing?.apiKeyEnc ?? null, apiKeyHint: existing?.apiKeyHint ?? null };
  } catch (error) {
    if (error instanceof SecretError) return { ok: false, error: error.message };
    throw error;
  }

  // Provider OpenAI/compatible tanpa key tidak bisa dipakai — tolak saat simpan, bukan saat analisis.
  if (rest.provider === "openai" && !keyData.apiKeyEnc) {
    return { ok: false, error: "API key wajib diisi untuk provider OpenAI / OpenAI-compatible" };
  }

  const data = { ...rest, baseUrl, ...keyData };
  if (existing) await prisma.aiConfig.update({ where: { id: existing.id }, data });
  else await prisma.aiConfig.create({ data: { workspaceId, ...data } });

  revalidatePath("/settings");
  return { ok: true };
}

/** Uji konfigurasi tersimpan dengan satu permintaan kecil, agar salah key/URL ketahuan sebelum analisis. */
export async function testAiConnection(): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  try {
    const settings = await requireAiSettings(workspaceId);
    await generateText({
      model: resolveModel(settings),
      temperature: 0,
      maxOutputTokens: 16,
      prompt: "Balas dengan satu kata: OK",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AiConfigError) return { ok: false, error: error.message };
    return { ok: false, error: `Koneksi ke model gagal: ${error instanceof Error ? error.message : "penyebab tidak diketahui"}` };
  }
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
