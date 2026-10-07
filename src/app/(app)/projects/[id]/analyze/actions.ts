"use server";

import { revalidatePath } from "next/cache";

import { AnalysisError } from "@/lib/ai/analyze";
import { advanceJob, createAnalysisJob, type AdvanceResult } from "@/lib/ai/job";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type BeginResult = { ok: true; jobId: string } | { ok: false; error: string };

/** Mulai analisis baru: validasi lalu buat job. Tanpa kuota — API key milik user sendiri (BYOK), biayanya tidak ditanggung aplikasi. */
export async function beginAnalysis(projectId: string): Promise<BeginResult> {
  const { workspaceId } = await requireScope();

  const estimation = await prisma.estimation.findFirst({
    where: { project: { id: projectId, workspaceId, deletedAt: null } },
    orderBy: { version: "desc" },
    select: { id: true, requirement: true },
  });
  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };
  if (estimation.requirement.trim().length < 50) {
    return { ok: false, error: "Requirement terlalu pendek untuk dianalisis" };
  }

  try {
    return { ok: true, jobId: await createAnalysisJob(estimation.id, workspaceId) };
  } catch (error) {
    if (error instanceof AnalysisError) return { ok: false, error: error.message };
    throw error;
  }
}

/** Jalankan satu tahap. Dipanggil berulang oleh klien; memanggil ulang job yang gagal hanya mengulang tahap itu. */
export async function advanceAnalysis(jobId: string, projectId: string): Promise<AdvanceResult> {
  const { workspaceId } = await requireScope();

  const result = await advanceJob(jobId, workspaceId);
  if (result.state === "done") revalidatePath(`/projects/${projectId}`);
  return result;
}
