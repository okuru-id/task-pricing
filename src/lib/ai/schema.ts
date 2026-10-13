import { z } from "zod";

/** Kontrak output AI persis seperti §3 PRD. Divalidasi ketat — AI tidak boleh mengarang field. */

/**
 * Tipe task tidak lagi enum tetap: daftarnya milik profil pekerjaan, dan model diberi
 * daftar itu lewat prompt. Nilai di luar daftar dinormalisasi di guardrail, bukan ditolak —
 * menggagalkan seluruh tahap hanya karena model menulis tipe yang tidak dikenal jauh lebih
 * merugikan daripada memetakannya ke tipe terdekat.
 */
export const taskTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .describe("Kode tipe task, persis salah satu dari daftar TIPE TASK yang diberikan");

export const complexitySchema = z.enum(["simple", "medium", "complex", "very_complex"]);

export const confidenceSchema = z.enum(["low", "medium", "high"]);

export const flagSchema = z.enum([
  "NO_FLAG",
  "CLARIFICATION_REQUIRED",
  "COMPLEX_REVIEW",
  "THIRD_PARTY_DEPENDENCY",
  "DATABASE_REVIEW",
  "ARCHITECTURE_REVIEW",
  "DATA_MIGRATION",
  "CHANGE_REQUEST",
]);

export const aiTaskSchema = z.object({
  name: z.string().min(1).describe("Nama task singkat, bahasa Indonesia"),
  type: taskTypeSchema,
  complexity: complexitySchema,
  reason: z.string().describe("Alasan singkat kenapa complexity ini dipilih"),
  // Sengaja longgar: model lemah sering mengisi teks bebas di sini. Nilai di luar
  // daftar flag dibuang saat normalisasi, dan guardrail menghitung ulang flag wajib.
  flags: z.array(z.string()),
  breakdown: z.array(z.string()).describe("Pekerjaan teknis konkret untuk task ini"),
  questions: z.array(z.string()).describe("Pertanyaan klarifikasi jika requirement ambigu"),
  confidence: confidenceSchema,
  custom_estimate_min: z
    .number()
    .nullable()
    .describe("WAJIB diisi (rupiah) jika complexity very_complex, selain itu null"),
  custom_estimate_max: z
    .number()
    .nullable()
    .describe("WAJIB diisi (rupiah) jika complexity very_complex, selain itu null"),
});

export const analysisSchema = z.object({
  tasks: z.array(aiTaskSchema),
  assumptions: z.array(z.string()),
  milestones_suggestion: z.array(
    z.object({ name: z.string(), tasks: z.array(z.string()) }),
  ),
});

export type AiTask = z.infer<typeof aiTaskSchema>;
export type Analysis = z.infer<typeof analysisSchema>;

/* ---------- Skema per tahap pipeline (§2 AI Analysis) ---------- */

/**
 * Tetap wajib di sini. Sebagian model menjawab urut tapi lupa menulis nomornya; kasus itu
 * ditambal `fillMissingIndexes()` pada data mentah sebelum validasi, bukan dengan melonggarkan skema.
 */
const indexSchema = z.number().int().nonnegative().describe("Nomor task persis seperti pada daftar");

export const extractStageSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().min(1).describe("Nama task singkat, bahasa Indonesia"),
        type: taskTypeSchema,
      }),
    )
    .min(1)
    .max(60),
  assumptions: z.array(z.string()).describe("Asumsi yang dipakai agar tidak terjadi dispute scope"),
});

export const breakdownStageSchema = z.object({
  items: z.array(
    z.object({
      index: indexSchema,
      breakdown: z.array(z.string()).describe("Pekerjaan teknis konkret untuk task ini"),
      questions: z.array(z.string()).describe("Pertanyaan klarifikasi jika requirement ambigu"),
    }),
  ),
});

export const complexityStageSchema = z.object({
  items: z.array(
    z.object({
      index: indexSchema,
      complexity: complexitySchema,
      reason: z.string().describe("Alasan singkat kenapa complexity ini dipilih"),
      confidence: confidenceSchema,
      custom_estimate_min: z.number().nullable().describe("WAJIB (rupiah) jika very_complex, selain itu null"),
      custom_estimate_max: z.number().nullable().describe("WAJIB (rupiah) jika very_complex, selain itu null"),
    }),
  ),
});

export const dependenciesStageSchema = z.object({
  // Longgar seperti aiTaskSchema.flags: nilai di luar enum dibuang saat guardrail.
  items: z.array(z.object({ index: indexSchema, flags: z.array(z.string()) })),
  milestones_suggestion: z.array(z.object({ name: z.string(), tasks: z.array(z.string()) })),
});

export type ExtractOutput = z.infer<typeof extractStageSchema>;
export type BreakdownOutput = z.infer<typeof breakdownStageSchema>;
export type ComplexityOutput = z.infer<typeof complexityStageSchema>;
export type DependenciesOutput = z.infer<typeof dependenciesStageSchema>;
