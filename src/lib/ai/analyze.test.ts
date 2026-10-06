import { describe, expect, it } from "vitest";

import { applyGuardrails } from "./analyze";
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
