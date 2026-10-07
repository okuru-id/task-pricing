import { describe, expect, it } from "vitest";

import {
  aggregate,
  checkGate,
  datasetProblems,
  labelProblems,
  scoreCase,
  type GoldenCase,
  type OutputTask,
  type Report,
} from "./metrics";

const golden: GoldenCase = {
  id: "g1",
  requirement: "Tambahkan login dengan Google dan pembayaran lewat Midtrans",
  labelledBy: ["a", "b"],
  expectedTasks: [
    { keywords: ["login", "google"], complexity: "medium", flags: ["THIRD_PARTY_DEPENDENCY"] },
    { keywords: ["midtrans"], complexity: "complex", flags: ["THIRD_PARTY_DEPENDENCY"] },
  ],
};

const out = (over: Partial<OutputTask>): OutputTask => ({
  name: "x",
  reason: "",
  breakdown: [],
  complexity: "medium",
  flags: ["NO_FLAG"],
  ...over,
});

describe("scoreCase", () => {
  it("menghitung kecocokan, complexity, dan flag", () => {
    const score = scoreCase(golden, [
      out({ name: "Login Google", complexity: "medium", flags: ["THIRD_PARTY_DEPENDENCY"] }),
      out({ name: "Integrasi Midtrans", complexity: "medium", flags: ["THIRD_PARTY_DEPENDENCY", "COMPLEX_REVIEW"] }),
    ]);
    expect(score).toMatchObject({
      matched: 2,
      complexityCorrect: 1,
      flagTruePositive: 2,
      flagFalsePositive: 1,
      hallucinated: 0,
    });
  });

  it("task yang tidak ada di requirement dihitung mengarang", () => {
    const score = scoreCase(golden, [
      out({ name: "Login Google" }),
      out({ name: "Integrasi Midtrans" }),
      out({ name: "Dashboard blockchain kuantum" }),
    ]);
    expect(score.hallucinated).toBe(1);
  });

  it("output null berarti tidak valid dan semua task terlewat", () => {
    expect(scoreCase(golden, null)).toMatchObject({ valid: false, matched: 0, expected: 2 });
  });

  it("satu task output tidak boleh dipakai dua label", () => {
    const score = scoreCase(golden, [out({ name: "Login Google lalu Midtrans" })]);
    expect(score.matched).toBe(1);
  });
});

describe("aggregate & checkGate", () => {
  const good: Report = {
    cases: 50,
    complexityAccuracy: 0.9,
    extractionRecall: 0.97,
    flagPrecision: 0.95,
    schemaValidity: 1,
    hallucinations: 0,
  };

  it("meloloskan laporan yang memenuhi semua ambang", () => {
    expect(checkGate(good)).toEqual([]);
  });

  it("menolak ambang yang gagal dan halusinasi apa pun", () => {
    const failures = checkGate({ ...good, complexityAccuracy: 0.8, hallucinations: 1 });
    expect(failures).toHaveLength(2);
  });

  it("mendeteksi regresi lebih dari 5 poin walau masih di atas ambang", () => {
    const baseline = { ...good, complexityAccuracy: 0.99 };
    expect(checkGate(good, baseline).some((f) => f.includes("regresi complexityAccuracy"))).toBe(true);
    expect(checkGate({ ...good, complexityAccuracy: 0.95 }, baseline)).toEqual([]);
  });

  it("schemaValidity turun jika ada kasus tanpa output valid", () => {
    const ok = scoreCase(golden, [out({ name: "Login Google" })]);
    const bad = scoreCase(golden, null);
    expect(aggregate([ok, bad]).schemaValidity).toBe(0.5);
  });
});

describe("datasetProblems", () => {
  it("meminta 50 kasus dan 2 reviewer", () => {
    const problems = datasetProblems([{ ...golden, labelledBy: ["a"] }]);
    expect(problems).toHaveLength(2);
    expect(datasetProblems(Array.from({ length: 50 }, (_, i) => ({ ...golden, id: String(i) })))).toEqual([]);
  });
});

describe("labelProblems", () => {
  it("menerima label yang sehat", () => {
    expect(labelProblems([golden])).toEqual([]);
  });

  it("menangkap complexity dan flag yang salah tulis", () => {
    const salah: GoldenCase = {
      ...golden,
      expectedTasks: [
        // @ts-expect-error — meniru typo pada file golden yang ditulis tangan
        { keywords: ["login"], complexity: "Medium", flags: ["THIRD_PARTY"] },
      ],
    };
    const problems = labelProblems([salah]);
    expect(problems.some((p) => p.includes('complexity "Medium"'))).toBe(true);
    expect(problems.some((p) => p.includes('flag "THIRD_PARTY"'))).toBe(true);
  });

  it("menangkap id ganda, requirement kosong, dan keyword kosong", () => {
    const problems = labelProblems([
      golden,
      { ...golden, requirement: "  " },
      { ...golden, id: "g2", expectedTasks: [{ keywords: [], complexity: "simple", flags: [] }] },
    ]);
    expect(problems.some((p) => p.includes("id ganda"))).toBe(true);
    expect(problems.some((p) => p.includes("requirement kosong"))).toBe(true);
    expect(problems.some((p) => p.includes("keywords kosong"))).toBe(true);
  });
});
