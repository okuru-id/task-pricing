import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { AnalysisError, persistAnalysis } from "./analyze";
import { runAiStage } from "./runner";
import { requireAiSettings } from "./provider";
import { STAGES, STAGE_COUNT, assembleAnalysis, type StageData } from "./stages";

/**
 * Orkestrasi analisis per tahap (§2 AI Analysis): tiap panggilan `advanceJob` menjalankan TEPAT SATU tahap
 * dan menyimpan hasilnya. Tahap yang gagal bisa diulang sendirian — tahap sebelumnya tidak dipanggil ulang.
 */

const LEASE_MS = 150_000;
/** Job yang tertinggal lebih lama dari ini tidak lagi ditawarkan untuk dilanjutkan. */
const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_REQUIREMENT_LENGTH = 50;

export type AdvanceResult =
  | { state: "progress"; completed: number }
  | { state: "busy" }
  | { state: "done"; taskCount: number }
  | { state: "failed"; stage: number; error: string };

export async function createAnalysisJob(estimationId: string, workspaceId: string): Promise<string> {
  const estimation = await prisma.estimation.findFirst({
    where: { id: estimationId, project: { workspaceId, deletedAt: null } },
    select: { requirement: true },
  });

  if (!estimation) throw new AnalysisError("Estimation tidak ditemukan");
  if (estimation.requirement.trim().length < MIN_REQUIREMENT_LENGTH) {
    throw new AnalysisError("Requirement terlalu pendek untuk dianalisis");
  }

  const job = await prisma.analysisJob.create({ data: { estimationId }, select: { id: true } });
  return job.id;
}

/** Job terakhir yang belum selesai (berjalan/gagal) untuk estimation ini, jika masih baru. */
export async function getResumableJob(estimationId: string, workspaceId: string) {
  const job = await prisma.analysisJob.findFirst({
    where: {
      estimationId,
      status: { in: ["RUNNING", "FAILED"] },
      createdAt: { gt: new Date(Date.now() - RESUME_WINDOW_MS) },
      estimation: { project: { workspaceId, deletedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, stage: true, status: true, error: true },
  });

  return job && job.stage < STAGE_COUNT ? job : null;
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Analisis gagal karena kesalahan tak terduga";

export async function advanceJob(jobId: string, workspaceId: string): Promise<AdvanceResult> {
  const job = await prisma.analysisJob.findFirst({
    where: { id: jobId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: {
      id: true,
      stage: true,
      status: true,
      data: true,
      estimationId: true,
      estimation: { select: { requirement: true } },
    },
  });
  if (!job) return { state: "failed", stage: 0, error: "Analisis tidak ditemukan" };

  // Idempoten: job yang sudah selesai tidak dijalankan lagi.
  if (job.status === "DONE") {
    const taskCount = await prisma.estimationTask.count({ where: { estimationId: job.estimationId } });
    return { state: "done", taskCount };
  }

  // Lease: hanya satu permintaan yang boleh menjalankan tahap ini (klik ganda / dua tab).
  const now = new Date();
  const claimed = await prisma.analysisJob.updateMany({
    where: {
      id: job.id,
      stage: job.stage,
      status: { in: ["RUNNING", "FAILED"] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { status: "RUNNING", error: null, lockedUntil: new Date(now.getTime() + LEASE_MS) },
  });
  if (claimed.count === 0) return { state: "busy" };

  const stage = STAGES[job.stage];
  const data = (job.data ?? {}) as StageData;

  try {
    if (stage.key === "estimate") {
      // Tahap akhir tanpa AI: rakit, terapkan guardrail, hitung harga lewat mesin harga, simpan.
      const { taskCount } = await persistAnalysis(job.estimationId, workspaceId, assembleAnalysis(data));
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: "DONE", stage: STAGE_COUNT, lockedUntil: null },
      });
      return { state: "done", taskCount };
    }

    const settings = await requireAiSettings(workspaceId);
    const output = await runAiStage(stage.key, job.estimation.requirement, data, settings);

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        stage: job.stage + 1,
        data: { ...data, [stage.key]: output } as Prisma.InputJsonValue,
        lockedUntil: null,
      },
    });
    return { state: "progress", completed: job.stage + 1 };
  } catch (error) {
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: messageOf(error), lockedUntil: null },
    });
    return { state: "failed", stage: job.stage, error: messageOf(error) };
  }
}
