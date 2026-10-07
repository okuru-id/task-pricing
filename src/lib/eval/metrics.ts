import type { TaskFlag } from "@prisma/client";

/**
 * Metrik evaluasi AI (§3, §5 Release Gate). Murni dan deterministik — tidak memanggil model.
 * Pelabelan golden set dilakukan manusia; modul ini hanya menghitung skor dari label tersebut.
 */

export interface ExpectedTask {
  /** Semua kata kunci harus muncul (case-insensitive) pada nama/alasan/rincian task hasil AI. */
  keywords: string[];
  complexity: "simple" | "medium" | "complex" | "very_complex";
  /** Flag yang seharusnya ada, selain NO_FLAG. */
  flags: TaskFlag[];
}

export interface GoldenCase {
  id: string;
  requirement: string;
  expectedTasks: ExpectedTask[];
  /** Nama reviewer yang melabeli. Rilis mensyaratkan 2 reviewer per kasus (§5). */
  labelledBy: string[];
}

export interface OutputTask {
  name: string;
  reason: string;
  breakdown: string[];
  complexity: ExpectedTask["complexity"];
  /** Flag SETELAH guardrail (yang benar-benar sampai ke user). */
  flags: TaskFlag[];
}

export interface CaseScore {
  valid: boolean;
  expected: number;
  matched: number;
  complexityCorrect: number;
  flagTruePositive: number;
  flagFalsePositive: number;
  hallucinated: number;
}

export interface Report {
  cases: number;
  /** Semua nilai 0..1. */
  complexityAccuracy: number;
  extractionRecall: number;
  flagPrecision: number;
  schemaValidity: number;
  /** Jumlah mutlak task yang tidak bisa ditelusuri ke requirement. */
  hallucinations: number;
}

const STOPWORDS = new Set(["yang", "dan", "untuk", "dengan", "pada", "dari", "atau", "agar", "dalam", "ini", "itu", "task", "fitur"]);

const normalize = (text: string) => text.toLowerCase();

const haystack = (task: OutputTask) => normalize([task.name, task.reason, ...task.breakdown].join(" "));

const tokens = (text: string) =>
  normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

/**
 * Task dianggap mengarang jika TIDAK cocok dengan label manapun DAN tidak berbagi
 * satu pun kata bermakna dengan requirement. Ini heuristik konservatif: lebih baik
 * melewatkan halusinasi halus daripada menuduh task sah.
 */
export function isHallucinated(task: OutputTask, requirement: string, matchedByLabel: boolean): boolean {
  if (matchedByLabel) return false;
  const reqTokens = new Set(tokens(requirement));
  return !tokens(task.name).some((word) => reqTokens.has(word));
}

export function scoreCase(golden: GoldenCase, output: OutputTask[] | null): CaseScore {
  const score: CaseScore = {
    valid: output !== null,
    expected: golden.expectedTasks.length,
    matched: 0,
    complexityCorrect: 0,
    flagTruePositive: 0,
    flagFalsePositive: 0,
    hallucinated: 0,
  };
  if (!output) return score;

  const claimed = new Set<number>();

  for (const expected of golden.expectedTasks) {
    const index = output.findIndex(
      (task, i) =>
        !claimed.has(i) && expected.keywords.every((keyword) => haystack(task).includes(normalize(keyword))),
    );
    if (index === -1) continue;

    claimed.add(index);
    const task = output[index];
    score.matched++;
    if (task.complexity === expected.complexity) score.complexityCorrect++;

    const predicted = task.flags.filter((flag) => flag !== "NO_FLAG");
    for (const flag of predicted) {
      if (expected.flags.includes(flag)) score.flagTruePositive++;
      else score.flagFalsePositive++;
    }
  }

  score.hallucinated = output.filter(
    (task, i) => isHallucinated(task, golden.requirement, claimed.has(i)),
  ).length;

  return score;
}

const ratio = (num: number, den: number, whenEmpty = 1) => (den === 0 ? whenEmpty : num / den);

export function aggregate(scores: CaseScore[]): Report {
  const sum = (pick: (s: CaseScore) => number) => scores.reduce((acc, s) => acc + pick(s), 0);

  const valid = scores.filter((s) => s.valid);
  const validSum = (pick: (s: CaseScore) => number) => valid.reduce((acc, s) => acc + pick(s), 0);

  return {
    cases: scores.length,
    complexityAccuracy: ratio(validSum((s) => s.complexityCorrect), validSum((s) => s.matched), 0),
    extractionRecall: ratio(sum((s) => s.matched), sum((s) => s.expected), 0),
    flagPrecision: ratio(
      validSum((s) => s.flagTruePositive),
      validSum((s) => s.flagTruePositive + s.flagFalsePositive),
    ),
    schemaValidity: ratio(valid.length, scores.length, 0),
    hallucinations: sum((s) => s.hallucinated),
  };
}

/** Ambang Release Gate (§3, §5). */
export const GATE = {
  complexityAccuracy: 0.85,
  extractionRecall: 0.95,
  flagPrecision: 0.9,
  schemaValidity: 0.98,
  hallucinations: 0,
  /** Skor tidak boleh turun lebih dari 5 poin dibanding baseline (§5 regression check). */
  maxRegression: 0.05,
  minCases: 50,
  minReviewers: 2,
} as const;

const RATE_KEYS = ["complexityAccuracy", "extractionRecall", "flagPrecision", "schemaValidity"] as const;

export function checkGate(report: Report, baseline?: Report | null): string[] {
  const failures: string[] = [];

  for (const key of RATE_KEYS) {
    if (report[key] < GATE[key]) {
      failures.push(`${key} ${(report[key] * 100).toFixed(1)}% < ${GATE[key] * 100}%`);
    }
  }
  if (report.hallucinations > GATE.hallucinations) {
    failures.push(`hallucinations ${report.hallucinations} > ${GATE.hallucinations}`);
  }

  if (baseline) {
    for (const key of RATE_KEYS) {
      const drop = baseline[key] - report[key];
      if (drop > GATE.maxRegression + 1e-9) {
        failures.push(`regresi ${key}: turun ${(drop * 100).toFixed(1)} poin dari baseline`);
      }
    }
  }

  return failures;
}

const COMPLEXITIES: ReadonlySet<string> = new Set([
  "simple",
  "medium",
  "complex",
  "very_complex",
]);

const FLAGS: ReadonlySet<string> = new Set<TaskFlag>([
  "NO_FLAG",
  "CLARIFICATION_REQUIRED",
  "COMPLEX_REVIEW",
  "THIRD_PARTY_DEPENDENCY",
  "DATABASE_REVIEW",
  "ARCHITECTURE_REVIEW",
  "DATA_MIGRATION",
  "CHANGE_REQUEST",
]);

/**
 * Label cacat (complexity salah tulis, flag tidak dikenal, keyword kosong) membuat skor
 * salah tanpa suara: task yang benar dihitung meleset. Dicek sebelum model dipanggil.
 */
export function labelProblems(cases: GoldenCase[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const item of cases) {
    if (seen.has(item.id)) problems.push(`id ganda: ${item.id}`);
    seen.add(item.id);

    if (!item.requirement.trim()) problems.push(`${item.id}: requirement kosong`);
    if (item.expectedTasks.length === 0) problems.push(`${item.id}: tidak punya expectedTasks`);

    for (const [index, task] of item.expectedTasks.entries()) {
      const at = `${item.id}[${index}]`;
      if (!COMPLEXITIES.has(task.complexity)) {
        problems.push(`${at}: complexity "${task.complexity}" tidak dikenal`);
      }
      if (task.keywords.length === 0 || task.keywords.some((word) => !word.trim())) {
        problems.push(`${at}: keywords kosong`);
      }
      for (const flag of task.flags) {
        if (!FLAGS.has(flag)) problems.push(`${at}: flag "${flag}" tidak dikenal`);
      }
    }
  }

  return problems;
}

/** Golden set hanya sah sebagai bukti rilis jika cukup banyak dan dilabeli ≥2 reviewer. */
export function datasetProblems(cases: GoldenCase[]): string[] {
  const problems: string[] = [];
  if (cases.length < GATE.minCases) {
    problems.push(`golden set baru ${cases.length} kasus, butuh ≥ ${GATE.minCases}`);
  }
  const underReviewed = cases.filter((c) => new Set(c.labelledBy).size < GATE.minReviewers);
  if (underReviewed.length > 0) {
    problems.push(`${underReviewed.length} kasus belum dilabeli ${GATE.minReviewers} reviewer: ${underReviewed.map((c) => c.id).join(", ")}`);
  }
  return problems;
}
