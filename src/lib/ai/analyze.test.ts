import { describe, expect, it } from "vitest";

import { applyGuardrails, normalizeTaskType } from "./analyze";
import type { AiTask } from "./schema";

const base: AiTask = {
  name: "Tambah menu",
  type: "enhancement",
  complexity: "simple",
  reason: "Perubahan UI kecil",
  flags: ["NO_FLAG"],
  breakdown: ["Tambah item menu"],
  questions: [],
  confidence: "high",
  custom_estimate_min: null,
  custom_estimate_max: null,
};

const task = (overrides: Partial<AiTask>): AiTask => ({ ...base, ...overrides });

describe("applyGuardrails", () => {
  it("membiarkan task sederhana tanpa flag tambahan", () => {
    expect(applyGuardrails(base).flags).toEqual(["NO_FLAG"]);
  });

  it("memberi THIRD_PARTY_DEPENDENCY pada task payment (§2 US4)", () => {
    const result = applyGuardrails(
      task({ name: "Integrasi pembayaran QRIS", complexity: "complex" }),
    );
    expect(result.flags).toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("memberi THIRD_PARTY_DEPENDENCY walau AI lupa, berdasarkan isi breakdown", () => {
    const result = applyGuardrails(
      task({ name: "Login pelanggan", breakdown: ["Konfigurasi OAuth Google"] }),
    );
    expect(result.flags).toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("tidak tertipu kata yang kebetulan memuat 'api' seperti Rapikan/terapi", () => {
    const result = applyGuardrails(
      task({ name: "Rapikan tampilan daftar produk", breakdown: ["Perbaiki jarak antar kartu"] }),
    );
    expect(result.flags).not.toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("tetap menandai 'API' sebagai kata utuh", () => {
    const result = applyGuardrails(
      task({ name: "Sambungkan API pihak ketiga", breakdown: ["Panggil endpoint mitra"] }),
    );
    expect(result.flags).toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("memakai kata kunci profil pekerjaan, bukan kata kunci software", () => {
    // Fotografer: "sewa studio" adalah ketergantungan pihak ketiga, "webhook" tidak relevan.
    const hints = { thirdPartyHints: "sewa studio|izin lokasi|vendor cetak" };

    const sewa = applyGuardrails(task({ name: "Sewa studio untuk sesi indoor" }), hints);
    expect(sewa.flags).toContain("THIRD_PARTY_DEPENDENCY");

    const webhook = applyGuardrails(task({ name: "Pasang webhook pembayaran" }), hints);
    expect(webhook.flags).not.toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("pola regex yang salah ketik tidak menggagalkan analisis — kembali ke default", () => {
    const result = applyGuardrails(
      task({ name: "Integrasi pembayaran QRIS" }),
      { thirdPartyHints: "payment|(((" },
    );
    expect(result.flags).toContain("THIRD_PARTY_DEPENDENCY");
  });

  it("memberi DATA_MIGRATION pada task migrasi data", () => {
    const result = applyGuardrails(task({ name: "Migrasi data produk lama" }));
    expect(result.flags).toContain("DATA_MIGRATION");
  });

  it("Very Complex selalu mendapat COMPLEX_REVIEW dan minimal 1 pertanyaan", () => {
    const result = applyGuardrails(
      task({
        name: "Integrasi payment gateway",
        complexity: "very_complex",
        questions: [],
        custom_estimate_min: 1_000_000,
        custom_estimate_max: 2_000_000,
      }),
    );

    expect(result.flags).toContain("COMPLEX_REVIEW");
    expect(result.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("Very Complex tanpa custom range ditandai perlu klarifikasi, bukan diberi harga", () => {
    const result = applyGuardrails(
      task({
        name: "Modul laporan baru",
        complexity: "very_complex",
        custom_estimate_min: null,
        custom_estimate_max: null,
      }),
    );

    expect(result.flags).toContain("CLARIFICATION_REQUIRED");
    expect(result.custom_estimate_min).toBeNull();
  });

  it("confidence low memicu CLARIFICATION_REQUIRED", () => {
    expect(applyGuardrails(task({ confidence: "low" })).flags).toContain(
      "CLARIFICATION_REQUIRED",
    );
  });

  it("tidak menyisakan NO_FLAG bersama flag lain", () => {
    const result = applyGuardrails(
      task({ name: "Integrasi API ongkir", flags: ["NO_FLAG"] }),
    );
    expect(result.flags).not.toContain("NO_FLAG");
  });
});

describe("normalizeTaskType", () => {
  const fotografi = [
    { code: "sesi_foto", label: "Sesi Foto" },
    { code: "editing", label: "Editing & Retouch" },
    { code: "cetak", label: "Cetak & Album" },
  ];

  it("menerima kode yang persis", () => {
    expect(normalizeTaskType("editing", fotografi)).toBe("editing");
  });

  it("menerima label yang ditulis model, bukan kodenya", () => {
    expect(normalizeTaskType("Sesi Foto", fotografi)).toBe("sesi_foto");
    expect(normalizeTaskType("Cetak & Album", fotografi)).toBe("cetak");
  });

  it("memaafkan spasi dan huruf besar", () => {
    expect(normalizeTaskType("  SESI FOTO ", fotografi)).toBe("sesi_foto");
    expect(normalizeTaskType("sesi-foto", fotografi)).toBe("sesi_foto");
  });

  it("tipe asing jatuh ke tipe pertama, bukan menggagalkan analisis", () => {
    // Model sesekali mengarang tipe; kehilangan satu analisis jauh lebih mahal
    // daripada tipe yang tinggal diperbaiki user di Review Tugas.
    expect(normalizeTaskType("new_feature", fotografi)).toBe("sesi_foto");
  });

  it("tanpa daftar tipe, nilai model dipertahankan apa adanya", () => {
    expect(normalizeTaskType("NEW_FEATURE", [])).toBe("NEW_FEATURE");
  });
});
