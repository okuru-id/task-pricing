"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const questionSchema = z.string().trim().min(1, "Pertanyaan tidak boleh kosong").max(1000);

/** Task harus milik workspace pemanggil (§4). */
async function locateTask(taskId: string, workspaceId: string) {
  return prisma.estimationTask.findFirst({
    where: { id: taskId, estimation: { project: { workspaceId, deletedAt: null } } },
    select: { id: true, complexity: true, estimation: { select: { projectId: true } } },
  });
}

async function locateQuestion(questionId: string, workspaceId: string) {
  return prisma.clarificationQuestion.findFirst({
    where: {
      id: questionId,
      task: { estimation: { project: { workspaceId, deletedAt: null } } },
    },
    select: {
      id: true,
      estimationTaskId: true,
      task: { select: { complexity: true, estimation: { select: { projectId: true } } } },
    },
  });
}

export async function addQuestion(taskId: string, question: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const task = await locateTask(taskId, workspaceId);
  if (!task) return { ok: false, error: "Tugas tidak ditemukan" };

  await prisma.clarificationQuestion.create({
    data: { estimationTaskId: taskId, question: parsed.data },
  });

  revalidatePath(`/projects/${task.estimation.projectId}/clarification`);
  return { ok: true };
}

export async function updateQuestion(questionId: string, question: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const found = await locateQuestion(questionId, workspaceId);
  if (!found) return { ok: false, error: "Pertanyaan tidak ditemukan" };

  await prisma.clarificationQuestion.update({
    where: { id: questionId },
    data: { question: parsed.data },
  });

  revalidatePath(`/projects/${found.task.estimation.projectId}/clarification`);
  return { ok: true };
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const found = await locateQuestion(questionId, workspaceId);
  if (!found) return { ok: false, error: "Pertanyaan tidak ditemukan" };

  // Very Complex wajib punya ≥1 pertanyaan (§2 US4) — pertanyaan terakhir tidak boleh dihapus.
  if (found.task.complexity === "VERY_COMPLEX") {
    const remaining = await prisma.clarificationQuestion.count({
      where: { estimationTaskId: found.estimationTaskId },
    });
    if (remaining <= 1) {
      return {
        ok: false,
        error: "Tugas Very Complex wajib punya minimal 1 pertanyaan klarifikasi",
      };
    }
  }

  await prisma.clarificationQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/projects/${found.task.estimation.projectId}/clarification`);
  return { ok: true };
}
