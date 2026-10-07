import { randomUUID } from "node:crypto";

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

/**
 * Job TERBARU untuk estimation ini, hanya jika belum selesai (berjalan/gagal) dan masih baru.
 * Yang dicari adalah job terbaru apa pun statusnya: job lama yang gagal tidak boleh muncul lagi setelah
 * "Mulai ulang" membuat job yang lebih baru (apalagi sudah selesai), karena melanjutkannya akan menimpa hasil baru.
 */
export async function getResumableJob(estimationId: string, workspaceId: string) {
  const latest = await prisma.analysisJob.findFirst({
    where: {
      estimationId,
      createdAt: { gt: new Date(Date.now() - RESUME_WINDOW_MS) },
      estimation: { project: { workspaceId, deletedAt: null } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, stage: true, status: true, error: true },
  });

  return latest && latest.status !== "DONE" && latest.stage < STAGE_COUNT ? latest : null;
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Analisis gagal karena kesalahan tak terduga";

/** Lease diambil alih pekerja lain saat tahap ini berjalan — hasil pekerja ini harus dibuang. */
class StaleClaimError extends Error {}
/** Ada analisis yang lebih baru untuk estimation yang sama; job ini tidak boleh menyimpan hasilnya. */
class SupersededError extends Error {}

const SUPERSEDED_MESSAGE = "Analisis ini sudah digantikan oleh analisis yang lebih baru. Mulai analisis baru dari halaman Analisis.";

export async function advanceJob(jobId: string, workspaceId: string): Promise<AdvanceResult> {
  const job = await prisma.analysisJob.findFirst({
    where: { id: jobId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: {
      id: true,
      stage: true,
      status: true,
      data: true,
      createdAt: true,
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

  // Job yang sudah digantikan job lebih baru tidak boleh berjalan: ia bisa menimpa hasil analisis yang lebih baru.
  const hasNewer = (client: Pick<Prisma.TransactionClient, "analysisJob">) =>
    client.analysisJob.count({ where: { estimationId: job.estimationId, createdAt: { gt: job.createdAt } } });
  if ((await hasNewer(prisma)) > 0) {
    return { state: "failed", stage: job.stage, error: SUPERSEDED_MESSAGE };
  }

  // Lease + token: hanya satu permintaan yang boleh menjalankan tahap ini (klik ganda / dua tab).
  // Token itu menjadi "fence": setiap penulisan hasil mencocokkannya, sehingga pekerja yang leasenya sudah
  // kedaluwarsa dan diambil alih tidak bisa menimpa hasil atau mengosongkan lease pekerja yang lebih baru.
  const now = new Date();
  const token = randomUUID();
  const claimed = await prisma.analysisJob.updateMany({
    where: {
      id: job.id,
      stage: job.stage,
      status: { in: ["RUNNING", "FAILED"] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { status: "RUNNING", error: null, lockedUntil: new Date(now.getTime() + LEASE_MS), claimToken: token },
  });
  if (claimed.count === 0) return { state: "busy" };

  const owned = { id: job.id, claimToken: token, stage: job.stage };
  const stage = STAGES[job.stage];
  const data = (job.data ?? {}) as StageData;

  try {
    if (stage.key === "estimate") {
      // Tahap akhir tanpa AI: rakit, terapkan guardrail, hitung harga lewat mesin harga, simpan.
      // Kepemilikan dan "belum digantikan" diperiksa DI DALAM transaksi penyimpanan; jika gagal, semuanya rollback.
      const { taskCount } = await persistAnalysis(job.estimationId, workspaceId, assembleAnalysis(data), async (tx) => {
        const done = await tx.analysisJob.updateMany({
          where: owned,
          data: { status: "DONE", stage: STAGE_COUNT, lockedUntil: null, claimToken: null },
        });
        if (done.count === 0) throw new StaleClaimError();
        if ((await hasNewer(tx)) > 0) throw new SupersededError();
      });
      return { state: "done", taskCount };
    }

    const settings = await requireAiSettings(workspaceId);
    const output = await runAiStage(stage.key, job.estimation.requirement, data, settings);

    const saved = await prisma.analysisJob.updateMany({
      where: owned,
      data: {
        stage: job.stage + 1,
        data: { ...data, [stage.key]: output } as Prisma.InputJsonValue,
        lockedUntil: null,
        claimToken: null,
      },
    });
    // Lease sudah diambil pekerja lain → buang hasil ini; klien cukup memanggil lagi dan membaca status terbaru.
    if (saved.count === 0) return { state: "busy" };
    return { state: "progress", completed: job.stage + 1 };
  } catch (error) {
    if (error instanceof StaleClaimError) return { state: "busy" };

    const message = error instanceof SupersededError ? SUPERSEDED_MESSAGE : messageOf(error);
    // Tulis kegagalan hanya jika lease masih milik kita; kalau tidak, pekerja lain yang menentukan statusnya.
    const failed = await prisma.analysisJob.updateMany({
      where: { id: job.id, claimToken: token },
      data: { status: "FAILED", error: message, lockedUntil: null, claimToken: null },
    });
    if (failed.count === 0) return { state: "busy" };
    return { state: "failed", stage: job.stage, error: message };
  }
}
