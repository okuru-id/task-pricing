import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Enkripsi secret yang disimpan di database (mis. API key AI milik user, BYOK).
 * AES-256-GCM; kunci diturunkan dari AUTH_SECRET. Mengganti AUTH_SECRET membuat secret lama tidak terbaca
 * (dideteksi lewat auth tag) — user cukup memasukkan ulang di Settings.
 */

export class SecretError extends Error {}

const PREFIX = "v1";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new SecretError("AUTH_SECRET belum diisi — dibutuhkan untuk mengenkripsi API key");
  return createHash("sha256").update(`taskpricer:secret-box:${PREFIX}:${secret}`).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [PREFIX, iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(":");
}

export function decryptSecret(token: string): string {
  const [prefix, iv, tag, body] = token.split(":");
  if (prefix !== PREFIX || !iv || !tag || !body) throw new SecretError("Format secret tersimpan tidak dikenali");

  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof SecretError) throw error;
    throw new SecretError("Secret tersimpan tidak bisa dibaca (AUTH_SECRET berubah atau data rusak)");
  }
}
