"use server";

import { revalidatePath } from "next/cache";
import type { Complexity, TaskFlag, TaskType } from "@prisma/client";
import { z } from "zod";

import { syncMilestonePrices } from "@/lib/data/milestones";
import { getPriceRules } from "@/lib/data/pricing";
import { prisma } from "@/lib/prisma";
import { PricingError, priceTask } from "@/lib/pricing-engine";
import { requireScope } from "@/lib/workspace";

const COMPLEXITIES = ["SIMPLE", "MEDIUM", "COMPLEX", "VERY_COMPLEX"] as const;
const TYPES = [
  "BUG",
  "ENHANCEMENT",
  "NEW_FEATURE",
  "INTEGRATION",
  "INFRASTRUCTURE",
  "INVESTIGATION",
  "MAINTENANCE",
  "CHANGE_REQUEST",
] as const;
const FLAGS = [
  "NO_FLAG",
  "CLARIFICATION_REQUIRED",
  "COMPLEX_REVIEW",
  "THIRD_PARTY_DEPENDENCY",
  "DATABASE_REVIEW",
  "ARCHITECTURE_REVIEW",
  "DATA_MIGRATION",
  "CHANGE_REQUEST",
] as const;

const updateSchema = z.object({
  taskId: z.string(),
  name: z.string().trim().min(1, "Nama tugas tidak boleh kosong").max(300),
  type: z.enum(TYPES),
  complexity: z.enum(COMPLEXITIES),
  reason: z.string().trim().max(2000).nullable(),
  description: z.string().trim().max(2000).nullable(),
  // 0 = belum diatur, 1 = tinggi, 2 = sedang, 3 = rendah
  priority: z.number().int().min(0).max(3),
  flags: z.array(z.enum(FLAGS)),
  breakdown: z.array(z.string().trim().min(1)).max(50),
  questions: z.array(z.string().trim().min(1)).max(50),
  customEstimateMin: z.number().int().nonnegative().nullable(),
  customEstimateMax: z.number().int().nonnegative().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Pastikan task memang milik workspace pemanggil, sekaligus ambil projectId-nya. */
async function locateTask(taskId: string, workspaceId: string) {
  return prisma.estimationTask.findFirst({
    where: { id: taskId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: { id: true, estimation: { select: { id: true, projectId: true } } },
  });
}

export async function updateTask(input: UpdateTaskInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const found = await locateTask(data.taskId, workspaceId);
  if (!found) return { ok: false, error: "Tugas tidak ditemukan" };

  // Very Complex wajib punya minimal 1 pertanyaan klarifikasi (§2 US4).
  if (data.complexity === "VERY_COMPLEX" && data.questions.length === 0) {
    return { ok: false, error: "Tugas Very Complex wajib punya minimal 1 pertanyaan klarifikasi" };
  }

  // Harga SELALU dihitung ulang di server dari complexity — angka dari client diabaikan (§3).
  const rules = await getPriceRules(workspaceId);
  let price: number;
  try {
    price = priceTask(
      {
        complexity: data.complexity,
        customEstimateMin: data.customEstimateMin,
        customEstimateMax: data.customEstimateMax,
      },
      rules,
    ).price;
  } catch (error) {
    if (error instanceof PricingError) return { ok: false, error: error.message };
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.estimationTask.update({
      where: { id: data.taskId },
      data: {
        name: data.name,
        type: data.type as TaskType,
        complexity: data.complexity as Complexity,
        reason: data.reason,
        description: data.description,
        priority: data.priority,
        price,
        customEstimateMin: data.complexity === "VERY_COMPLEX" ? data.customEstimateMin : null,
        customEstimateMax: data.complexity === "VERY_COMPLEX" ? data.customEstimateMax : null,
        edited: true, // dipakai KPI "tingkat edit manual pasca-AI" (§1)
      },
    });

    await tx.taskBreakdown.deleteMany({ where: { estimationTaskId: data.taskId } });
    if (data.breakdown.length > 0) {
      await tx.taskBreakdown.createMany({
        data: data.breakdown.map((description, order) => ({
          estimationTaskId: data.taskId,
          description,
          order,
        })),
      });
    }

    await tx.taskFlagEntry.deleteMany({ where: { estimationTaskId: data.taskId } });
    const flags = data.flags.filter((flag) => flag !== "NO_FLAG") as TaskFlag[];
    if (flags.length > 0) {
      await tx.taskFlagEntry.createMany({
        data: flags.map((flag) => ({ estimationTaskId: data.taskId, flag })),
      });
    }

    await tx.clarificationQuestion.deleteMany({ where: { estimationTaskId: data.taskId } });
    if (data.questions.length > 0) {
      await tx.clarificationQuestion.createMany({
        data: data.questions.map((question) => ({ estimationTaskId: data.taskId, question })),
      });
    }

    await syncMilestonePrices(tx, found.estimation.id);
  });

  revalidatePath(`/projects/${found.estimation.projectId}`);
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const found = await locateTask(taskId, workspaceId);
  if (!found) return { ok: false, error: "Tugas tidak ditemukan" };

  await prisma.$transaction(async (tx) => {
    await tx.taskBreakdown.deleteMany({ where: { estimationTaskId: taskId } });
    await tx.taskFlagEntry.deleteMany({ where: { estimationTaskId: taskId } });
    await tx.clarificationQuestion.deleteMany({ where: { estimationTaskId: taskId } });
    await tx.estimationTask.delete({ where: { id: taskId } });
    await syncMilestonePrices(tx, found.estimation.id);
  });

  revalidatePath(`/projects/${found.estimation.projectId}`);
  return { ok: true };
}

export async function addTask(projectId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const estimation = await prisma.estimation.findFirst({
    where: { project: { id: projectId, workspaceId, deletedAt: null } },
    orderBy: { version: "desc" },
    select: { id: true, _count: { select: { tasks: true } } },
  });

  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };

  const rules = await getPriceRules(workspaceId);

  await prisma.estimationTask.create({
    data: {
      estimationId: estimation.id,
      name: "Tugas baru",
      type: "NEW_FEATURE",
      complexity: "SIMPLE",
      confidence: "HIGH",
      price: priceTask({ complexity: "SIMPLE" }, rules).price,
      order: estimation._count.tasks,
      edited: true,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Geser task satu posisi. Urutan dinormalisasi ulang agar tidak ada nilai ganda setelah hapus/tambah. */
export async function moveTask(taskId: string, direction: "up" | "down"): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const found = await locateTask(taskId, workspaceId);
  if (!found) return { ok: false, error: "Tugas tidak ditemukan" };

  const siblings = await prisma.estimationTask.findMany({
    where: { estimationId: found.estimation.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const from = siblings.findIndex((task) => task.id === taskId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= siblings.length) return { ok: true };

  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];

  await prisma.$transaction(
    siblings.map((task, order) =>
      prisma.estimationTask.update({ where: { id: task.id }, data: { order } }),
    ),
  );

  revalidatePath(`/projects/${found.estimation.projectId}`);
  return { ok: true };
}
