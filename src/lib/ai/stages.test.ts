import { describe, expect, it } from "vitest";

import { assembleAnalysis, missingIndexes, taskLines, validateStageOutput, STAGES, type StageData } from "./stages";

const data: StageData = {
  extract: {
    tasks: [
      { name: "Login Google", type: "new_feature" },
      { name: "Perbaiki total", type: "bug" },
    ],
    assumptions: ["Desain dari klien"],
  },
  breakdown: {
    items: [
      { index: 0, breakdown: ["Setup OAuth"], questions: ["Akun apa?"] },
      { index: 1, breakdown: ["Cek rumus"], questions: [] },
    ],
  },
  complexity: {
    items: [
      { index: 0, complexity: "medium", reason: "r0", confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
      { index: 1, complexity: "simple", reason: "r1", confidence: "medium", custom_estimate_min: null, custom_estimate_max: null },
    ],
  },
  dependencies: {
    items: [
      { index: 0, flags: ["THIRD_PARTY_DEPENDENCY"] },
      { index: 1, flags: ["NO_FLAG"] },
    ],
    milestones_suggestion: [{ name: "Fondasi", tasks: ["Login Google"] }],
  },
};

describe("STAGES", () => {
  it("urutannya sesuai PRD dan estimasi (mesin harga) di akhir", () => {
    expect(STAGES.map((s) => s.key)).toEqual(["extract", "breakdown", "complexity", "dependencies", "estimate"]);
  });
});

describe("missingIndexes", () => {
  it("menemukan nomor task yang tidak dijawab", () => {
    expect(missingIndexes([{ index: 0 }, { index: 2 }], 4)).toEqual([1, 3]);
    expect(missingIndexes([{ index: 0 }, { index: 1 }], 2)).toEqual([]);
  });
});

describe("validateStageOutput", () => {
  it("menolak jawaban yang tidak mencakup semua task", () => {
    const partial = { items: [{ index: 0, breakdown: ["a"], questions: [] }] };
    expect(() => validateStageOutput("breakdown", partial, data)).toThrow(/nomor 2/);
  });

  it("menolak bentuk yang salah (zod)", () => {
    expect(() => validateStageOutput("extract", { tasks: [] , assumptions: [] }, {})).toThrow();
  });

  it("menerima jawaban lengkap", () => {
    expect(() => validateStageOutput("complexity", data.complexity, data)).not.toThrow();
  });
});

describe("taskLines", () => {
  it("menambah breakdown dan complexity seiring tahap selesai", () => {
    expect(taskLines({ extract: data.extract })[0]).toMatchObject({ index: 0, name: "Login Google", type: "new_feature" });
    expect(taskLines(data)[1]).toMatchObject({ complexity: "simple", breakdown: ["Cek rumus"] });
  });
});

describe("assembleAnalysis", () => {
  it("merakit keluaran semua tahap menjadi Analysis", () => {
    const analysis = assembleAnalysis(data);
    expect(analysis.tasks[0]).toMatchObject({
      name: "Login Google",
      complexity: "medium",
      flags: ["THIRD_PARTY_DEPENDENCY"],
      breakdown: ["Setup OAuth"],
      questions: ["Akun apa?"],
    });
    expect(analysis.assumptions).toEqual(["Desain dari klien"]);
    expect(analysis.milestones_suggestion).toHaveLength(1);
  });

  it("gagal jika ada tahap yang belum lengkap", () => {
    expect(() => assembleAnalysis({ extract: data.extract })).toThrow(/belum lengkap/);
  });
});
