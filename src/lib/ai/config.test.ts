import { describe, expect, it } from "vitest";

import { keyHint, validateBaseUrl } from "./config";

describe("validateBaseUrl", () => {
  it("menerima https publik tanpa slash di akhir", () => {
    expect(validateBaseUrl("https://api.openai.com/v1/")).toEqual({ ok: true, url: "https://api.openai.com/v1" });
  });

  it("menolak localhost, jaringan privat, dan nama internal secara default", () => {
    for (const url of [
      "http://localhost:11434/v1",
      "http://127.0.0.1:8080",
      "http://[::1]:8080",
      "http://10.0.0.5/v1",
      "http://192.168.1.10/v1",
      "http://2130706433/", // 127.0.0.1 dalam bentuk desimal
      "http://0x7f.1/",
      "http://ollama:11434/v1",
      "http://nas.local/v1",
      "http://[::ffff:127.0.0.1]/",
    ]) {
      expect(validateBaseUrl(url), url).toMatchObject({ ok: false });
    }
  });

  it("self-host (allowPrivate) boleh localhost/jaringan privat, tapi metadata cloud tetap ditolak", () => {
    expect(validateBaseUrl("http://localhost:11434/v1", { allowPrivate: true })).toEqual({ ok: true, url: "http://localhost:11434/v1" });
    expect(validateBaseUrl("http://192.168.1.10/v1", { allowPrivate: true })).toMatchObject({ ok: true });
    expect(validateBaseUrl("http://169.254.169.254/", { allowPrivate: true })).toMatchObject({ ok: false });
    expect(validateBaseUrl("http://metadata.google.internal/", { allowPrivate: true })).toMatchObject({ ok: false });
  });

  it("menolak skema selain http(s) dan teks bukan URL", () => {
    expect(validateBaseUrl("file:///etc/passwd")).toMatchObject({ ok: false });
    expect(validateBaseUrl("ftp://host")).toMatchObject({ ok: false });
    expect(validateBaseUrl("bukan url")).toMatchObject({ ok: false });
  });

  it("menolak kredensial di URL dan alamat metadata cloud", () => {
    expect(validateBaseUrl("https://user:pw@api.example.com")).toMatchObject({ ok: false });
    expect(validateBaseUrl("http://169.254.169.254/latest/meta-data")).toMatchObject({ ok: false });
    expect(validateBaseUrl("http://metadata.google.internal/")).toMatchObject({ ok: false });
  });
});

describe("keyHint", () => {
  it("hanya 4 karakter terakhir", () => {
    expect(keyHint("sk-abcdef123456")).toBe("3456");
  });
});
