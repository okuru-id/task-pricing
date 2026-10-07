/** Aturan murni untuk konfigurasi AI per workspace (BYOK). Tanpa DB dan tanpa environment. */

export const AI_PROVIDERS = {
  openai: "OpenAI / OpenAI-compatible",
  ollama: "Ollama (lokal)",
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";

/** Host yang tidak pernah sah sebagai endpoint model: metadata cloud/link-local (mencegah SSRF ke kredensial instance). */
const BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata", "instance-data"]);

/**
 * Validasi Base URL yang diketik user. Localhost sengaja boleh (Ollama / gateway lokal);
 * yang ditolak: skema selain http(s), kredensial di URL, dan alamat metadata cloud.
 */
export function validateBaseUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Base URL tidak valid (contoh: https://api.openai.com/v1)" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Base URL harus diawali http:// atau https://" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Jangan menaruh kredensial di Base URL — isi pada kolom API key" };
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || /^169\.254\./.test(host) || host === "[fd00:ec2::254]") {
    return { ok: false, error: "Alamat ini tidak diizinkan sebagai Base URL" };
  }

  return { ok: true, url: url.toString().replace(/\/+$/, "") };
}

/** Empat karakter terakhir untuk petunjuk "key tersimpan" — tanpa perlu mendekripsi saat menampilkan Settings. */
export const keyHint = (apiKey: string) => apiKey.slice(-4);
