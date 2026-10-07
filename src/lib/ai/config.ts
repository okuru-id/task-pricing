import { isPrivateHostname } from "./net";

/** Aturan murni untuk konfigurasi AI per workspace (BYOK). Tanpa DB dan tanpa environment. */

export const AI_PROVIDERS = {
  openai: "OpenAI / OpenAI-compatible",
  ollama: "Ollama (lokal)",
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";

/** Host yang tidak pernah sah sebagai endpoint model, apa pun kebijakannya: metadata cloud/link-local. */
const BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata", "instance-data"]);

export interface BaseUrlPolicy {
  /** Izinkan localhost / jaringan privat (self-host, mis. Ollama lokal). Default: tidak. */
  allowPrivate?: boolean;
}

/**
 * Validasi Base URL yang diketik user (umpan balik cepat saat menyimpan). Ini BUKAN satu-satunya pertahanan:
 * nama host yang lolos di sini tetap diperiksa lagi saat koneksi (lihat guarded-fetch.ts) agar DNS rebinding
 * dan redirect tidak bisa menembus ke jaringan internal.
 */
export function validateBaseUrl(
  raw: string,
  { allowPrivate = false }: BaseUrlPolicy = {},
): { ok: true; url: string } | { ok: false; error: string } {
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
  if (BLOCKED_HOSTS.has(host) || /^169\.254\./.test(host)) {
    return { ok: false, error: "Alamat ini tidak diizinkan sebagai Base URL" };
  }
  if (!allowPrivate && isPrivateHostname(host)) {
    return {
      ok: false,
      error:
        "Base URL menunjuk jaringan privat/lokal dan tidak diizinkan di server ini. Gunakan endpoint publik (HTTPS); alamat lokal hanya untuk self-host.",
    };
  }

  return { ok: true, url: url.toString().replace(/\/+$/, "") };
}

/** Empat karakter terakhir untuk petunjuk "key tersimpan" — tanpa perlu mendekripsi saat menampilkan Settings. */
export const keyHint = (apiKey: string) => apiKey.slice(-4);
