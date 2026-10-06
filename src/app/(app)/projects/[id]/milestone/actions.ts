"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { syncMilestonePrices } from "@/lib/data/milestones";
import { groupTasksIntoMilestones } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const nameSchema = z.string().trim().min(1, "Nama milestone tidak boleh kosong").max(200);

const done = (projectId: string): ActionResult => {
  revalidatePath(`/projects/${projectId}/milestone`);
  return { ok: true };
};

async function latestEstimation(projectId: string, workspaceId: string) {
  return prisma.estimation.findFirst({
    where: { project: { id: projectId, workspaceId, deletedAt: null } },
    orderBy: { version: "desc" },
    select: { id: true, projectId: true },
  });
}

async function locateMilestone(milestoneId: string, workspaceId: string) {
  return prisma.milestone.findFirst({
    where: { id: milestoneId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: { id: true, estimationId: true, estimation: { select: { projectId: true } } },
  });
}

export async function createMilestone(projectId: string, name: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const estimation = await latestEstimation(projectId, workspaceId);
  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };

  const last = await prisma.milestone.aggregate({
    where: { estimationId: estimation.id },
    _max: { priority: true },
  });

  await prisma.milestone.create({
    data: { estimationId: estimation.id, name: parsed.data, priority: (last._max.priority ?? -1) + 1, price: 0 },
  });

  return done(projectId);
}

export async function renameMilestone(milestoneId: string, name: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const found = await locateMilestone(milestoneId, workspaceId);
  if (!found) return { ok: false, error: "Milestone tidak ditemukan" };

  await prisma.milestone.update({ where: { id: milestoneId }, data: { name: parsed.data } });
  return done(found.estimation.projectId);
}

/** Task di dalamnya tidak ikut terhapus — kembali ke daftar "belum dikelompokkan". */
export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const found = await locateMilestone(milestoneId, workspaceId);
  if (!found) return { ok: false, error: "Milestone tidak ditemukan" };

  await prisma.milestone.delete({ where: { id: milestoneId } });
  return done(found.estimation.projectId);
}

export async function moveMilestone(milestoneId: string, direction: "up" | "down"): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const found = await locateMilestone(milestoneId, workspaceId);
  if (!found) return { ok: false, error: "Milestone tidak ditemukan" };

  const siblings = await prisma.milestone.findMany({
    where: { estimationId: found.estimationId },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const from = siblings.findIndex((m) => m.id === milestoneId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= siblings.length) return { ok: true };

  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];

  await prisma.$transaction(
    siblings.map((m, priority) => prisma.milestone.update({ where: { id: m.id }, data: { priority } })),
  );
  return done(found.estimation.projectId);
}

/** Pindahkan task ke milestone (atau `null` = lepas). Milestone harus dari estimation yang sama dengan task. */
export async function assignTask(taskId: string, milestoneId: string | null): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const task = await prisma.estimationTask.findFirst({
    where: { id: taskId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: { id: true, estimationId: true, estimation: { select: { projectId: true } } },
  });
  if (!task) return { ok: false, error: "Tugas tidak ditemukan" };

  if (milestoneId) {
    const milestone = await locateMilestone(milestoneId, workspaceId);
    if (!milestone || milestone.estimationId !== task.estimationId) {
      return { ok: false, error: "Milestone tidak ditemukan" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.estimationTask.update({ where: { id: taskId }, data: { milestoneId } });
    await syncMilestonePrices(tx, task.estimationId);
  });

  return done(task.estimation.projectId);
}

/** Ganti seluruh pengelompokan dengan pembagian otomatis per tipe pekerjaan (tanpa AI). */
export async function autoGroupMilestones(projectId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const estimation = await latestEstimation(projectId, workspaceId);
  if (!estimation) return { ok: false, error: "Estimation tidak ditemukan" };

  const tasks = await prisma.estimationTask.findMany({
    where: { estimationId: estimation.id },
    orderBy: { order: "asc" },
    select: { id: true, type: true },
  });
  if (tasks.length === 0) return { ok: false, error: "Belum ada tugas untuk dikelompokkan" };

  const drafts = groupTasksIntoMilestones(tasks);

  await prisma.$transaction(async (tx) => {
    await tx.milestone.deleteMany({ where: { estimationId: estimation.id } });

    for (const [priority, draft] of drafts.entries()) {
      const milestone = await tx.milestone.create({
        data: { estimationId: estimation.id, name: draft.name, priority, price: 0 },
      });
      await tx.estimationTask.updateMany({
        where: { id: { in: draft.taskIds } },
        data: { milestoneId: milestone.id },
      });
    }
    await syncMilestonePrices(tx, estimation.id);
  });

  return done(projectId);
}
