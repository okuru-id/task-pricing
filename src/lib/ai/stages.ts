import type { z } from "zod";

import type { AiStageKey, TaskLine } from "./prompt";
import {
  analysisSchema,
  breakdownStageSchema,
  complexityStageSchema,
  dependenciesStageSchema,
  extractStageSchema,
  type Analysis,
  type BreakdownOutput,
  type ComplexityOutput,
  type DependenciesOutput,
  type ExtractOutput,
} from "./schema";

/**
 * Tahap pipeline analisis (§2 AI Analysis): empat tahap AI + tahap estimasi oleh mesin harga.
 * Modul ini murni — tanpa DB maupun model — agar urutan, perakitan, dan validasi bisa diuji.
 */

export const STAGES = [
  { key: "extract", title: "Mengekstrak kebutuhan", detail: "Membaca percakapan dan mengenali fitur yang diminta" },
  { key: "breakdown", title: "Memecah menjadi tugas", detail: "Menyusun langkah kerja dan pertanyaan klarifikasi tiap tugas" },
  { key: "complexity", title: "Menilai kompleksitas", detail: "Menilai tingkat kesulitan tiap tugas" },
  { key: "dependencies", title: "Memetakan dependensi", detail: "Menandai risiko, pihak ketiga, dan mengusulkan milestone" },
  { key: "estimate", title: "Menyusun estimasi", detail: "Menghitung harga lewat mesin harga aplikasi" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const STAGE_COUNT = STAGES.length;

/** Keluaran tahap yang sudah selesai; disimpan di job agar tahap yang gagal bisa diulang sendirian. */
export interface StageData {
  extract?: ExtractOutput;
  breakdown?: BreakdownOutput;
  complexity?: ComplexityOutput;
  dependencies?: DependenciesOutput;
}

export const STAGE_SCHEMAS = {
  extract: extractStageSchema,
  breakdown: breakdownStageSchema,
  complexity: complexityStageSchema,
  dependencies: dependenciesStageSchema,
} satisfies Record<AiStageKey, z.ZodType>;

export class StageError extends Error {}

/** Index 0..count-1 yang tidak muncul di `items`. */
export function missingIndexes(items: { index: number }[], count: number): number[] {
  const seen = new Set(items.map((item) => item.index));
  return Array.from({ length: count }, (_, i) => i).filter((i) => !seen.has(i));
}

/** Pastikan model menjawab SETIAP task — jawaban parsial akan diam-diam menjadi task tanpa langkah/kompleksitas. */
export function assertCovers(stage: string, items: { index: number }[], count: number) {
  const missing = missingIndexes(items, count);
  if (missing.length > 0) {
    throw new StageError(`Tahap ${stage} tidak mencakup task nomor ${missing.map((i) => i + 1).join(", ")}`);
  }
}

/** Validasi hasil tahap terhadap konteks tahap sebelumnya (jumlah task). */
export function validateStageOutput(stage: AiStageKey, output: unknown, data: StageData): unknown {
  const parsed = STAGE_SCHEMAS[stage].parse(output);
  const count = data.extract?.tasks.length ?? 0;

  if (stage === "breakdown") assertCovers(stage, (parsed as BreakdownOutput).items, count);
  if (stage === "complexity") assertCovers(stage, (parsed as ComplexityOutput).items, count);
  if (stage === "dependencies") assertCovers(stage, (parsed as DependenciesOutput).items, count);

  return parsed;
}

/** Daftar task bernomor untuk prompt tahap berikutnya, diperkaya sesuai data yang sudah ada. */
export function taskLines(data: StageData): TaskLine[] {
  return (data.extract?.tasks ?? []).map((task, index) => ({
    index,
    name: task.name,
    type: task.type,
    complexity: data.complexity?.items.find((item) => item.index === index)?.complexity,
    breakdown: data.breakdown?.items.find((item) => item.index === index)?.breakdown,
  }));
}

/** Rakit keluaran semua tahap menjadi satu `Analysis` yang sama bentuknya dengan kontrak §3. */
export function assembleAnalysis(data: StageData): Analysis {
  const { extract, breakdown, complexity, dependencies } = data;
  if (!extract || !breakdown || !complexity || !dependencies) {
    throw new StageError("Tahap sebelumnya belum lengkap");
  }

  const by = <T extends { index: number }>(items: T[]) => new Map(items.map((item) => [item.index, item]));
  const breakdowns = by(breakdown.items);
  const complexities = by(complexity.items);
  const dependencyItems = by(dependencies.items);

  const tasks = extract.tasks.map((task, index) => {
    const steps = breakdowns.get(index);
    const level = complexities.get(index);
    const deps = dependencyItems.get(index);
    if (!steps || !level || !deps) throw new StageError(`Data task nomor ${index + 1} tidak lengkap`);

    return {
      name: task.name,
      type: task.type,
      complexity: level.complexity,
      reason: level.reason,
      flags: deps.flags,
      breakdown: steps.breakdown,
      questions: steps.questions,
      confidence: level.confidence,
      custom_estimate_min: level.custom_estimate_min,
      custom_estimate_max: level.custom_estimate_max,
    };
  });

  // Validasi akhir terhadap kontrak yang sama dengan sebelum pipeline dipecah.
  return analysisSchema.parse({
    tasks,
    assumptions: extract.assumptions,
    milestones_suggestion: dependencies.milestones_suggestion,
  });
}
