"use server";

import { revalidatePath } from "next/cache";

import { AnalysisError, runAnalysis } from "@/lib/ai/analyze";
import { AiConfigError } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type AnalyzeResult = { ok: true; taskCount: number } | { ok: false; error: string };

export async function startAnalysis(projectId: string): Promise<AnalyzeResult> {
  const { workspaceId } = await requireScope();

  const estimation = await prisma.estimation.findFirst({
    where: { project: { id: projectId, workspaceId, deletedAt: null } },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };

  try {
    const result = await runAnalysis(estimation.id, workspaceId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, taskCount: result.taskCount };
  } catch (error) {
    // Tampilkan penyebab apa adanya — jangan pernah lanjut dengan harga palsu (§5).
    if (error instanceof AnalysisError || error instanceof AiConfigError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Analisis gagal karena kesalahan tak terduga",
    };
  }
}
