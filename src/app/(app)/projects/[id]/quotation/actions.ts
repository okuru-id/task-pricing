"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { tasksMissingQuestions } from "@/lib/clarification";
import { getPriceRules, getPricingProfileRef } from "@/lib/data/pricing";
import { prisma } from "@/lib/prisma";
import { QUOTABLE_FROM } from "@/lib/project-status";
import { PricingError } from "@/lib/pricing-engine";
import { buildSnapshot } from "@/lib/quotation";
import { requireScope } from "@/lib/workspace";

const MAX_VERSION_ATTEMPTS = 5;

export type CreateQuotationResult = { ok: true } | { ok: false; error: string };

/** Bekukan estimation terbaru menjadi quotation versi baru (harga di-snapshot). */
export async function createQuotation(projectId: string): Promise<CreateQuotationResult> {
  const { workspaceId } = await requireScope();

  const estimation = await prisma.estimation.findFirst({
    where: { project: { id: projectId, workspaceId, deletedAt: null } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      assumptions: true,
      tasks: {
        orderBy: { order: "asc" },
        select: {
          name: true,
          type: true,
          complexity: true,
          customEstimateMin: true,
          customEstimateMax: true,
          breakdowns: { orderBy: { order: "asc" }, select: { description: true } },
          flags: { select: { flag: true } },
          clarificationQuestions: { select: { question: true } },
        },
      },
    },
  });

  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };

  const missing = tasksMissingQuestions(
    estimation.tasks.map((task) => ({
      name: task.name,
      complexity: task.complexity,
      questions: task.clarificationQuestions,
    })),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Tugas Very Complex wajib punya pertanyaan klarifikasi: ${missing.map((t) => t.name).join(", ")}`,
    };
  }

  const [rules, profile] = await Promise.all([getPriceRules(workspaceId), getPricingProfileRef(workspaceId)]);

  let snapshot;
  try {
    snapshot = buildSnapshot(
      estimation.tasks.map((task) => ({
        name: task.name,
        type: task.type,
        complexity: task.complexity,
        customEstimateMin: task.customEstimateMin,
        customEstimateMax: task.customEstimateMax,
        breakdown: task.breakdowns.map((b) => b.description),
        flags: task.flags.map((f) => f.flag),
      })),
      rules,
    );
  } catch (error) {
    if (error instanceof PricingError) return { ok: false, error: error.message };
    throw error;
  }

  // Nomor versi diambil dari max+1 lalu dijaga constraint unik (estimationId, version). Dua permintaan
  // bersamaan bisa menghitung versi yang sama — yang kalah (P2002) mengulang dengan nomor terbaru.
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const latest = await tx.quotation.aggregate({
          where: { estimationId: estimation.id },
          _max: { version: true },
        });

        await tx.quotation.create({
          data: {
            estimationId: estimation.id,
            version: (latest._max.version ?? 0) + 1,
            total: snapshot.total,
            totalMax: snapshot.totalMax,
            assumptions: estimation.assumptions,
            exclusions: snapshot.exclusions,
            items: {
              create: snapshot.items.map((item) => ({
                ...item,
                currency: "IDR",
                pricingProfileId: profile?.id ?? null,
                profileVersion: profile?.version ?? null,
              })),
            },
          },
        });

        // Accepted/Completed/Archived tidak diturunkan oleh versi quotation baru.
        await tx.project.updateMany({
          where: { id: projectId, status: { in: QUOTABLE_FROM } },
          data: { status: "QUOTED" },
        });
      });
      break;
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!conflict || attempt >= MAX_VERSION_ATTEMPTS) throw error;
    }
  }

  revalidatePath(`/projects/${projectId}/quotation`);
  return { ok: true };
}
