import { generateText, tool } from "ai";
import type { Complexity, TaskFlag, TaskType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPriceRules } from "@/lib/data/pricing";
import { priceTask, type PriceRules } from "@/lib/pricing-engine";

import { analysisSchema, flagSchema, type AiTask, type Analysis } from "./schema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { getAiSettings, resolveModel, type AiSettings } from "./provider";

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

/** Kata kunci yang menandakan task menyembunyikan kompleksitas (§2 US4). */
const THIRD_PARTY_HINTS =
  /payment|pembayaran|midtrans|xendit|stripe|qris|gateway|whatsapp|api|integrasi|integration|webhook|oauth|sso|google login/i;
const MIGRATION_HINTS = /migrasi|migration|import data|pindah data/i;

export class AnalysisError extends Error {}

/**
 * Terapkan guardrail yang TIDAK boleh diserahkan ke AI.
 * Dijalankan setelah output lolos Zod, sebelum disimpan.
 */
const VALID_FLAGS = new Set<string>(flagSchema.options);

/** Task setelah guardrail: flag dijamin berupa enum yang sah. */
export type NormalizedTask = Omit<AiTask, "flags"> & { flags: TaskFlag[] };

export function applyGuardrails(task: AiTask): NormalizedTask {
  // Flag bebas-teks dari model dibuang; hanya nilai enum yang dipertahankan.
  const flags = new Set<TaskFlag>(
    task.flags.filter((f): f is TaskFlag => VALID_FLAGS.has(f) && f !== "NO_FLAG"),
  );
  const haystack = `${task.name} ${task.reason} ${task.breakdown.join(" ")}`;

  // §2 US4: task payment/integrasi/pihak ketiga wajib punya flag minimal ini.
  if (THIRD_PARTY_HINTS.test(haystack)) flags.add("THIRD_PARTY_DEPENDENCY");
  if (MIGRATION_HINTS.test(haystack)) flags.add("DATA_MIGRATION");
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

/**
 * Structured output lewat tool call terpaksa, bukan `response_format: json_schema`.
 * Tool calling didukung luas (OpenAI, endpoint OpenAI-compatible, Ollama),
 * sedangkan json_schema banyak diabaikan gateway pihak ketiga (§5 vendor lock-in).
 */
async function generateAnalysis(requirement: string, workspaceId: string): Promise<Analysis> {
  return generateAnalysisWith(requirement, await getAiSettings(workspaceId));
}

/** Dipisah dari akses DB agar script eval offline bisa memanggilnya dengan settings eksplisit. */
export async function generateAnalysisWith(
  requirement: string,
  settings: AiSettings,
): Promise<Analysis> {
  const model = resolveModel(settings);

  const run = async (): Promise<Analysis> => {
    const result = await generateText({
      model,
      temperature: settings.temperature,
      system: settings.systemPrompt
        ? `${SYSTEM_PROMPT}\n\nINSTRUKSI GLOBAL USER:\n${settings.systemPrompt}`
        : SYSTEM_PROMPT,
      prompt: buildUserPrompt(requirement),
      tools: {
        submit_analysis: tool({
          description: "Kirimkan hasil analisis requirement dalam format terstruktur.",
          inputSchema: analysisSchema,
        }),
      },
      toolChoice: { type: "tool", toolName: "submit_analysis" },
    });

    const call = result.toolCalls.at(0);
    if (!call) throw new Error("model tidak memanggil tool submit_analysis");

    // Validasi ulang dengan Zod — jangan percaya begitu saja pada input tool.
    return analysisSchema.parse(call.input);
  };

  try {
    return await run();
  } catch {
    // §5: satu auto-retry sebelum menyerah. Jangan tampilkan harga palsu kalau tetap gagal.
    try {
      return await run();
    } catch (error) {
      throw new AnalysisError(
        `AI gagal menghasilkan output yang valid: ${
          error instanceof Error ? error.message : "penyebab tidak diketahui"
        }`,
      );
    }
  }
}

/** Jalankan analisis untuk sebuah estimation lalu simpan hasilnya (menimpa task lama). */
export async function runAnalysis(estimationId: string, workspaceId: string) {
  const estimation = await prisma.estimation.findFirst({
    where: { id: estimationId, project: { workspaceId, deletedAt: null } },
    select: { id: true, requirement: true, projectId: true },
  });

  if (!estimation) throw new AnalysisError("Estimation tidak ditemukan");
  if (estimation.requirement.trim().length < 50) {
    throw new AnalysisError("Requirement terlalu pendek untuk dianalisis");
  }

  const [analysis, rules] = await Promise.all([
    generateAnalysis(estimation.requirement, workspaceId),
    getPriceRules(workspaceId),
  ]);

  const tasks = analysis.tasks.map(applyGuardrails);

  await prisma.$transaction(async (tx) => {
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

    // Asumsi AI disimpan agar tampil otomatis di quotation (§2) dan mencegah dispute scope.
    await tx.estimation.update({
      where: { id: estimationId },
      data: { assumptions: analysis.assumptions },
    });

    for (const [index, task] of tasks.entries()) {
      await tx.estimationTask.create({
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
    }

    // Hanya Draft yang naik ke Analyzed; analisis ulang tidak boleh menurunkan Quoted/Accepted.
    await tx.project.updateMany({
      where: { id: estimation.projectId, status: "DRAFT" },
      data: { status: "ANALYZED" },
    });
  });

  return { taskCount: tasks.length, assumptions: analysis.assumptions };
}
