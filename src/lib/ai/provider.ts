import { createOpenAI } from "@ai-sdk/openai";

import { decryptSecret, SecretError } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

import { OLLAMA_DEFAULT_BASE_URL, type AiProvider } from "./config";

/**
 * Konfigurasi AI sepenuhnya dari database (diisi user di Settings — BYOK). TIDAK ada fallback ke environment
 * variable: tanpa konfigurasi, analisis berhenti dengan pesan yang mengarahkan ke Settings.
 */
export interface AiSettings {
  provider: AiProvider;
  model: string;
  temperature: number;
  systemPrompt: string | null;
  baseUrl: string | null;
  apiKey: string | null;
}

export class AiConfigError extends Error {}

/** Tampilan aman untuk klien: tanpa API key, hanya petunjuk 4 karakter terakhir. */
export interface AiConfigView {
  provider: AiProvider;
  model: string;
  temperature: number;
  systemPrompt: string | null;
  baseUrl: string | null;
  hasKey: boolean;
  keyHint: string | null;
}

const asProvider = (value: string): AiProvider => (value === "ollama" ? "ollama" : "openai");

/** Konfigurasi untuk Settings (tanpa mendekripsi key). Null jika workspace belum pernah menyimpan. */
export async function getAiConfigView(workspaceId: string): Promise<AiConfigView | null> {
  const config = await prisma.aiConfig.findFirst({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  if (!config) return null;

  return {
    provider: asProvider(config.provider),
    model: config.model,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
    baseUrl: config.baseUrl,
    hasKey: Boolean(config.apiKeyEnc),
    keyHint: config.apiKeyHint,
  };
}

/** Pesan kenapa konfigurasi belum bisa dipakai, atau null jika lengkap. */
export function describeIncompleteConfig(view: AiConfigView | null): string | null {
  if (!view) return "Belum ada konfigurasi AI. Atur provider, model, dan API key di Settings.";
  if (!view.model.trim()) return "Model AI belum diisi di Settings.";
  if (view.provider === "openai" && !view.hasKey) return "API key belum diisi di Settings.";
  if (view.provider === "ollama" && !view.baseUrl) return "Base URL Ollama belum diisi di Settings.";
  return null;
}

/** Konfigurasi lengkap termasuk API key terdekripsi, untuk memanggil model. Melempar AiConfigError bila belum siap. */
export async function requireAiSettings(workspaceId: string): Promise<AiSettings> {
  const config = await prisma.aiConfig.findFirst({ where: { workspaceId }, orderBy: { createdAt: "desc" } });

  const problem = describeIncompleteConfig(
    config && {
      provider: asProvider(config.provider),
      model: config.model,
      temperature: config.temperature,
      systemPrompt: config.systemPrompt,
      baseUrl: config.baseUrl,
      hasKey: Boolean(config.apiKeyEnc),
      keyHint: config.apiKeyHint,
    },
  );
  if (problem || !config) throw new AiConfigError(problem ?? "Belum ada konfigurasi AI.");

  let apiKey: string | null = null;
  if (config.apiKeyEnc) {
    try {
      apiKey = decryptSecret(config.apiKeyEnc);
    } catch (error) {
      const reason = error instanceof SecretError ? error.message : "penyebab tidak diketahui";
      throw new AiConfigError(`API key tersimpan tidak bisa dipakai (${reason}). Masukkan ulang di Settings.`);
    }
  }

  return {
    provider: asProvider(config.provider),
    model: config.model,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
    baseUrl: config.baseUrl,
    apiKey,
  };
}


const SSE_TERMINATOR = /data:\s*\[DONE\]\s*$/;

/**
 * Ambil payload JSON dari body yang dibungkus gaya SSE.
 * Mengembalikan null jika body sudah berupa JSON biasa atau tidak dikenali.
 */
function extractJsonPayload(body: string): string | null {
  let text = body.trim().replace(SSE_TERMINATOR, "").trim();
  if (!text) return null;

  if (text.startsWith("data:")) {
    const events = text
      .split("\n")
      .map((line) => line.replace(/^data:\s*/, "").trim())
      .filter(Boolean);
    text = events.at(-1) ?? "";
  }

  if (!text.startsWith("{")) return null;
  return text === body ? null : text;
}

/**
 * Gateway OpenAI-compatible tertentu membalas permintaan NON-streaming dengan
 * `content-type: text/event-stream` plus terminator `data: [DONE]` di akhir body,
 * sehingga SDK gagal dengan "Invalid JSON response". Di sini body dinormalkan
 * kembali menjadi JSON. Permintaan streaming sungguhan diteruskan apa adanya.
 */
const sanitizingFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);

  const wantsStream = typeof init?.body === "string" && /"stream"\s*:\s*true/.test(init.body);
  if (wantsStream || !response.body) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("event-stream") && !contentType.includes("json")) {
    return response;
  }

  const body = await response.text();
  const payload = extractJsonPayload(body);
  if (payload === null) return new Response(body, response);

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");

  return new Response(payload, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Semua provider lewat satu abstraksi OpenAI-compatible (§5 mitigasi vendor lock-in).
 * Ollama dilayani lewat endpoint /v1 bawaannya. Hanya memakai `settings` — tidak membaca environment.
 */
export function resolveModel(settings: AiSettings) {
  const isOllama = settings.provider === "ollama";

  const baseURL = isOllama ? (settings.baseUrl ?? OLLAMA_DEFAULT_BASE_URL) : (settings.baseUrl ?? undefined);
  const apiKey = isOllama ? "ollama" : settings.apiKey;

  if (!apiKey) throw new AiConfigError("API key belum diisi di Settings.");
  if (!settings.model.trim()) throw new AiConfigError("Model AI belum diisi di Settings.");

  // `.chat()` wajib: pemanggilan default memakai Responses API (/v1/responses),
  // sedangkan mayoritas endpoint OpenAI-compatible hanya menyediakan /v1/chat/completions.
  return createOpenAI({ apiKey, baseURL, fetch: sanitizingFetch }).chat(settings.model);
}
