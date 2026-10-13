"use server";

import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { z } from "zod";

import { DEFAULT_OPENAI_BASE_URL, OLLAMA_DEFAULT_BASE_URL, keyHint, validateBaseUrl } from "@/lib/ai/config";
import { outboundFetch, privateEndpointsAllowed } from "@/lib/ai/guarded-fetch";
import { AiConfigError, requireAiSettings, resolveModel } from "@/lib/ai/provider";
import { SecretError, decryptSecret, encryptSecret } from "@/lib/crypto";
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
    const checked = validateBaseUrl(rawBaseUrl, { allowPrivate: privateEndpointsAllowed() });
    if (!checked.ok) return { ok: false, error: checked.error };
    baseUrl = checked.url;
  }
  if (rest.provider === "ollama" && !baseUrl) {
    // Default localhost hanya masuk akal untuk self-host; di server yang memblokir jaringan privat harus alamat publik.
    if (!privateEndpointsAllowed()) {
      return { ok: false, error: "Base URL Ollama wajib diisi dengan alamat publik — localhost tidak diizinkan di server ini" };
    }
    baseUrl = OLLAMA_DEFAULT_BASE_URL;
  }

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

const listSchema = z.object({
  baseUrl: z.string().trim().max(500).optional(),
  /** Kosong = pakai key tersimpan (user belum mengetik ulang). */
  apiKey: z.string().trim().max(500).optional(),
});

export type ListModelsResult =
  | { ok: true; models: string[] }
  | { ok: false; error: string };

/**
 * Ambil daftar model dari provider (`GET {baseUrl}/models`, format OpenAI; Ollama juga
 * menyediakannya lewat endpoint kompatibel). Memakai nilai yang sedang diketik di form bila ada,
 * supaya user bisa melihat daftar sebelum menyimpan. Tetap lewat guard SSRF.
 */
export async function listModels(input: unknown): Promise<ListModelsResult> {
  const { workspaceId } = await requireScope();

  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const stored = await prisma.aiConfig.findFirst({ where: { workspaceId }, orderBy: { createdAt: "desc" } });

  const rawBaseUrl = parsed.data.baseUrl || stored?.baseUrl || DEFAULT_OPENAI_BASE_URL;
  const checked = validateBaseUrl(rawBaseUrl, { allowPrivate: privateEndpointsAllowed() });
  if (!checked.ok) return { ok: false, error: checked.error };

  let apiKey = parsed.data.apiKey ?? "";
  if (!apiKey && stored?.apiKeyEnc) {
    try {
      apiKey = decryptSecret(stored.apiKeyEnc);
    } catch (error) {
      if (error instanceof SecretError) return { ok: false, error: error.message };
      throw error;
    }
  }

  try {
    const response = await outboundFetch()(`${checked.url}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Provider menolak permintaan daftar model (HTTP ${response.status}). Isi nama model secara manual.`,
      };
    }

    const body = (await response.json()) as { data?: { id?: unknown }[]; models?: { name?: unknown }[] };
    // Format OpenAI: {data:[{id}]}. Ollama non-kompatibel: {models:[{name}]}.
    const models = [
      ...(body.data ?? []).map((item) => item.id),
      ...(body.models ?? []).map((item) => item.name),
    ].filter((id): id is string => typeof id === "string" && id.length > 0);

    if (models.length === 0) {
      return { ok: false, error: "Provider tidak mengembalikan satu pun model. Isi nama model secara manual." };
    }

    return { ok: true, models: [...new Set(models)].sort((a, b) => a.localeCompare(b)) };
  } catch (error) {
    return {
      ok: false,
      error: `Gagal mengambil daftar model: ${error instanceof Error ? error.message : "penyebab tidak diketahui"}`,
    };
  }
}

// Identitas perusahaan pindah ke halaman Profil — lihat src/app/(app)/profile/actions.ts.
