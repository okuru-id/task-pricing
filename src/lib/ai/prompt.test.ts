import { describe, expect, it } from "vitest";

import { buildStageSystem, type AiStageKey } from "./prompt";

const STAGES: AiStageKey[] = ["extract", "breakdown", "complexity", "dependencies"];

describe("buildStageSystem tanpa profil pekerjaan", () => {
  // Jaring regresi: workspace lama tidak punya JobProfile, dan prompt-nya harus tetap
  // sama persis seperti sebelum profil diperkenalkan — kalau tidak, skor eval yang sudah
  // diukur (53 kasus) kehilangan arti sebagai pembanding.
  it("mempertahankan identitas software developer", () => {
    for (const stage of STAGES) {
      expect(buildStageSystem(stage)).toContain(
        "asisten analisis requirement untuk freelancer software developer Indonesia",
      );
    }
  });

  it("mempertahankan definisi kompleksitas bawaan", () => {
    const system = buildStageSystem("complexity");
    expect(system).toContain("simple: scope jelas, perubahan kecil, dependency rendah");
    expect(system).toContain("medium: frontend + backend, query DB");
    expect(system).toContain("complex: beberapa module, business logic penting");
    expect(system).toContain("very_complex: module baru, integrasi payment");
  });
});

describe("buildStageSystem dengan profil pekerjaan", () => {
  const fotografi = {
    aiInstruction: "Anda menganalisis pekerjaan fotografi dan videografi acara.",
    simpleGuide: "satu sesi singkat tanpa kru tambahan.",
    mediumGuide: "setengah hari dengan satu asisten.",
    complexGuide: "multi-lokasi atau butuh kru dan perizinan.",
    veryComplexGuide: "produksi besar dengan jadwal lintas hari.",
  };

  it("mengganti identitas, bukan menumpuknya", () => {
    const system = buildStageSystem("extract", null, fotografi);
    expect(system).toContain("Anda menganalisis pekerjaan fotografi dan videografi acara.");
    expect(system).not.toContain("freelancer software developer Indonesia");
  });

  it("memakai definisi kompleksitas profesi, bukan istilah software", () => {
    const system = buildStageSystem("complexity", null, fotografi);
    expect(system).toContain("simple: satu sesi singkat tanpa kru tambahan.");
    expect(system).toContain("very_complex: produksi besar dengan jadwal lintas hari.");
    expect(system).not.toContain("query DB");
    expect(system).not.toContain("integrasi payment");
  });

  it("field yang dikosongkan jatuh ke default, bukan jadi baris kosong", () => {
    const system = buildStageSystem("complexity", null, {
      aiInstruction: "Anda menganalisis pekerjaan penulisan konten.",
      simpleGuide: "artikel pendek dari brief yang jelas.",
    });

    expect(system).toContain("simple: artikel pendek dari brief yang jelas.");
    // mediumGuide tidak diisi → tetap memakai default software, dan TIDAK boleh jadi "- medium: "
    expect(system).toContain("medium: frontend + backend");
    expect(system).not.toMatch(/- medium: *\n/);
  });

  it("instruksi global user tetap ditambahkan di akhir", () => {
    const system = buildStageSystem("extract", "Selalu sebut nama klien.", fotografi);
    expect(system).toContain("INSTRUKSI GLOBAL USER:\nSelalu sebut nama klien.");
    expect(system.indexOf("INSTRUKSI GLOBAL USER")).toBeGreaterThan(
      system.indexOf("fotografi dan videografi"),
    );
  });
});
