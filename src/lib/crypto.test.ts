import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SecretError, decryptSecret, encryptSecret } from "./crypto";

const original = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = "secret-satu";
});
afterEach(() => {
  process.env.AUTH_SECRET = original;
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trip dan tidak menyimpan plaintext", () => {
    const token = encryptSecret("sk-rahasia-123");
    expect(token).not.toContain("sk-rahasia");
    expect(decryptSecret(token)).toBe("sk-rahasia-123");
  });

  it("menghasilkan token berbeda tiap kali (IV acak)", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("gagal jika data diubah", () => {
    const [p, iv, tag, body] = encryptSecret("sk-abc").split(":");
    const tampered = [p, iv, tag, Buffer.from("zzzzzz").toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow(SecretError);
    expect(body).toBeTruthy();
  });

  it("gagal jika AUTH_SECRET berubah", () => {
    const token = encryptSecret("sk-abc");
    process.env.AUTH_SECRET = "secret-dua";
    expect(() => decryptSecret(token)).toThrow(/tidak bisa dibaca/);
  });

  it("menolak jika AUTH_SECRET kosong dan format asing", () => {
    expect(() => decryptSecret("bukan-token")).toThrow(SecretError);
    delete process.env.AUTH_SECRET;
    expect(() => encryptSecret("x")).toThrow(/AUTH_SECRET/);
  });
});
