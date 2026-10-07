/**
 * Konstanta provider yang dipakai UI. Sengaja dipisah dari `config.ts`:
 * file itu menarik `./net` → `node:net`, yang tidak boleh ikut ke bundle browser.
 */

export const AI_PROVIDERS = {
  openai: "OpenAI / OpenAI-compatible",
  ollama: "Ollama (lokal)",
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";
