import { describe, expect, it } from "vitest";

import { keyHint, validateBaseUrl } from "./config";

describe("validateBaseUrl", () => {
  it("menerima https biasa dan localhost, tanpa slash di akhir", () => {
    expect(validateBaseUrl("https://api.openai.com/v1/")).toEqual({ ok: true, url: "https://api.openai.com/v1" });
    expect(validateBaseUrl("http://localhost:11434/v1")).toEqual({ ok: true, url: "http://localhost:11434/v1" });
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
