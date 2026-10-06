import { createOpenAI } from "@ai-sdk/openai";

import { prisma } from "@/lib/prisma";

export interface AiSettings {
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string | null;
}

const DEFAULTS: AiSettings = {
  provider: "openai",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.2,
  systemPrompt: null,
};

export async function getAiSettings(workspaceId: string): Promise<AiSettings> {
  const config = await prisma.aiConfig.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  if (!config) return DEFAULTS;

  return {
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
  };
}

export class AiConfigError extends Error {}

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
 * Ollama dilayani lewat endpoint /v1 bawaannya.
 */
export function resolveModel(settings: AiSettings) {
  const isOllama = settings.provider === "ollama";

  const baseURL = isOllama
    ? process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1"
    : process.env.OPENAI_BASE_URL || undefined;

  const apiKey = isOllama ? "ollama" : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AiConfigError(
      "OPENAI_API_KEY belum diisi. Set di .env, atau pilih provider Ollama di Settings.",
    );
  }

  // `.chat()` wajib: pemanggilan default memakai Responses API (/v1/responses),
  // sedangkan mayoritas endpoint OpenAI-compatible hanya menyediakan /v1/chat/completions.
  return createOpenAI({ apiKey, baseURL, fetch: sanitizingFetch }).chat(settings.model);
}
