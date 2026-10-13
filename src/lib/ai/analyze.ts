import type { Complexity, Prisma, TaskFlag, TaskType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { syncMilestonePrices } from "@/lib/data/milestones";
import { getPriceRules } from "@/lib/data/pricing";
import { matchSuggestions } from "@/lib/milestones";
import { priceTask, type PriceRules } from "@/lib/pricing-engine";

import { AnalysisError } from "./errors";
import { flagSchema, type AiTask, type Analysis } from "./schema";

const TYPE_MAP: Record<AiTask["type"], TaskType> = {
  bug: "BUG",
  enhancement: "ENHANCEMENT",
  new_feature: "NEW_FEATURE",
  integration: "INTEGRATION",
  infrastructure: "INFRASTRUCTURE",
  investigation: "INVESTIGATION",
  maintenance: "MAINTENANCE",
  change_request: "CHANGE_REQUEST",
};

const COMPLEXITY_MAP: Record<AiTask["complexity"], Complexity> = {
  simple: "SIMPLE",
  medium: "MEDIUM",
  complex: "COMPLEX",
  very_complex: "VERY_COMPLEX",
};

const CONFIDENCE_MAP = { low: "LOW", medium: "MEDIUM", high: "HIGH" } as const;

/**
 * Kata kunci yang menandakan task menyembunyikan kompleksitas (§2 US4).
 *
 * Batas kata (\b) wajib untuk token pendek: tanpa itu "api" cocok dengan "Rapikan" dan "terapi",
 * sehingga task tak berdosa ikut ditandai tergantung pihak ketiga.
 */
const THIRD_PARTY_HINTS =
  /payment|pembayaran|midtrans|xendit|stripe|qris|gateway|whatsapp|\bapi\b|integrasi|integration|webhook|oauth|\bsso\b|google login/i;
const MIGRATION_HINTS = /migrasi|migration|import data|pindah data/i;

/**
 * Kata kunci pemicu flag per profil pekerjaan. "webhook" tidak berarti apa pun bagi fotografer,
 * sementara "sewa studio" atau "izin lokasi" justru ketergantungan pihak ketiga bagi mereka.
 * Pola tak sah diabaikan (bukan melempar) supaya salah ketik di Pengaturan tidak menggagalkan
 * analisis — perilakunya tinggal kembali ke default software.
 */
export interface GuardrailHints {
  thirdPartyHints?: string | null;
  migrationHints?: string | null;
}

function toRegex(pattern: string | null | undefined, fallback: RegExp): RegExp {
  const source = pattern?.trim();
  if (!source) return fallback;

  try {
    return new RegExp(source, "i");
  } catch {
    return fallback;
  }
}

export { AnalysisError } from "./errors";
export { generateAnalysisWith } from "./runner";

/**
 * Terapkan guardrail yang TIDAK boleh diserahkan ke AI.
 * Dijalankan setelah output lolos Zod, sebelum disimpan.
 */
const VALID_FLAGS = new Set<string>(flagSchema.options);

/** Task setelah guardrail: flag dijamin berupa enum yang sah. */
export type NormalizedTask = Omit<AiTask, "flags"> & { flags: TaskFlag[] };

export function applyGuardrails(task: AiTask, hints?: GuardrailHints | null): NormalizedTask {
  // Flag bebas-teks dari model dibuang; hanya nilai enum yang dipertahankan.
  const flags = new Set<TaskFlag>(
    task.flags.filter((f): f is TaskFlag => VALID_FLAGS.has(f) && f !== "NO_FLAG"),
  );
  const haystack = `${task.name} ${task.reason} ${task.breakdown.join(" ")}`;

  const thirdParty = toRegex(hints?.thirdPartyHints, THIRD_PARTY_HINTS);
  const migration = toRegex(hints?.migrationHints, MIGRATION_HINTS);

  // §2 US4: task payment/integrasi/pihak ketiga wajib punya flag minimal ini.
  if (thirdParty.test(haystack)) flags.add("THIRD_PARTY_DEPENDENCY");
  if (migration.test(haystack)) flags.add("DATA_MIGRATION");
  if (task.complexity === "very_complex") flags.add("COMPLEX_REVIEW");
  if (task.confidence === "low") flags.add("CLARIFICATION_REQUIRED");

  const questions = [...task.questions];

  // Model sering mengisi estimasi (sering dalam jam) untuk task non-very-complex.
  // Harga task tersebut murni dari pricing rules, jadi angka ini dibuang.
  if (task.complexity !== "very_complex") {
    task = { ...task, custom_estimate_min: null, custom_estimate_max: null };
  }

  if (task.complexity === "very_complex") {
    // §2 US4: Very Complex wajib minimal 1 pertanyaan klarifikasi.
    if (questions.length === 0) {
      questions.push(
        `Bisa dijelaskan lebih detail ruang lingkup "${task.name}"? Estimasi masih perlu konfirmasi.`,
      );
    }
    // AI gagal mengisi range: jangan mengarang harga, minta user melengkapi.
    if (task.custom_estimate_min == null || task.custom_estimate_max == null) {
      flags.add("CLARIFICATION_REQUIRED");
    }
  }

  return {
    ...task,
    flags: flags.size > 0 ? [...flags] : ["NO_FLAG"],
    questions,
  };
}

/** Very Complex tanpa range = 0 sampai user mengisinya. Tidak pernah dipaksa jadi harga default. */
function resolvePrice(task: AiTask, rules: PriceRules): number {
  const complexity = COMPLEXITY_MAP[task.complexity];

  if (complexity === "VERY_COMPLEX") {
    return task.custom_estimate_min ?? 0;
  }

  return priceTask({ complexity }, rules).price;
}

/** Simpan hasil analisis ke estimation (menimpa task lama). Dipanggil di tahap akhir pipeline. */
export async function persistAnalysis(
  estimationId: string,
  workspaceId: string,
  analysis: Analysis,
  /** Dijalankan paling awal di dalam transaksi; melempar error = seluruh penyimpanan dibatalkan (rollback). */
  beforeCommit?: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  const estimation = await prisma.estimation.findFirst({
    where: { id: estimationId, project: { workspaceId, deletedAt: null } },
    select: {
      id: true,
      projectId: true,
      // Kata kunci pemicu flag mengikuti profil pekerjaan project, bukan konstanta software.
      project: {
        select: { jobProfile: { select: { thirdPartyHints: true, migrationHints: true } } },
      },
    },
  });
  if (!estimation) throw new AnalysisError("Estimation tidak ditemukan");

  const rules = await getPriceRules(workspaceId);

  const hints = estimation.project.jobProfile;
  const tasks = analysis.tasks.map((task) => applyGuardrails(task, hints));

  await prisma.$transaction(async (tx) => {
    await beforeCommit?.(tx);

    // Analisis ulang mengganti hasil AI sebelumnya; edit user ikut tergantikan.
    const previous = await tx.estimationTask.findMany({
      where: { estimationId },
      select: { id: true },
    });
    const ids = previous.map((task) => task.id);

    if (ids.length > 0) {
      await tx.taskBreakdown.deleteMany({ where: { estimationTaskId: { in: ids } } });
      await tx.taskFlagEntry.deleteMany({ where: { estimationTaskId: { in: ids } } });
      await tx.clarificationQuestion.deleteMany({ where: { estimationTaskId: { in: ids } } });
      await tx.estimationTask.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.milestone.deleteMany({ where: { estimationId } });

    // Asumsi AI disimpan agar tampil otomatis di quotation (§2) dan mencegah dispute scope.
    await tx.estimation.update({
      where: { id: estimationId },
      data: { assumptions: analysis.assumptions },
    });

    const created: { id: string; name: string }[] = [];

    for (const [index, task] of tasks.entries()) {
      const row = await tx.estimationTask.create({
        select: { id: true, name: true },
        data: {
          estimationId,
          name: task.name,
          type: TYPE_MAP[task.type],
          complexity: COMPLEXITY_MAP[task.complexity],
          reason: task.reason,
          confidence: CONFIDENCE_MAP[task.confidence],
          price: resolvePrice(task, rules),
          customEstimateMin: task.custom_estimate_min,
          customEstimateMax: task.custom_estimate_max,
          order: index,
          breakdowns: {
            create: task.breakdown.map((description, order) => ({ description, order })),
          },
          flags: { create: task.flags.map((flag) => ({ flag })) },
          clarificationQuestions: {
            create: task.questions.map((question) => ({ question })),
          },
        },
      });
      created.push(row);
    }

    // Saran milestone AI disimpan sebagai pengelompokan task; yang tidak dikenali dibuang.
    const drafts = matchSuggestions(analysis.milestones_suggestion, created);
    for (const [priority, draft] of drafts.entries()) {
      const milestone = await tx.milestone.create({
        data: { estimationId, name: draft.name, priority, price: 0 },
      });
      await tx.estimationTask.updateMany({
        where: { id: { in: draft.taskIds } },
        data: { milestoneId: milestone.id },
      });
    }
    await syncMilestonePrices(tx, estimationId);

    // Hanya Draft yang naik ke Analyzed; analisis ulang tidak boleh menurunkan Quoted/Accepted.
    await tx.project.updateMany({
      where: { id: estimation.projectId, status: "DRAFT" },
      data: { status: "ANALYZED" },
    });
  });

  return { taskCount: tasks.length, assumptions: analysis.assumptions };
}
