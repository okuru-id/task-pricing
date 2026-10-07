"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canTransition, restoreTarget } from "@/lib/project-status";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES: ProjectStatus[] = [
  "DRAFT",
  "ANALYZED",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "COMPLETED",
  "ARCHIVED",
];

export async function setProjectStatus(projectId: string, to: ProjectStatus): Promise<ActionResult> {
  const { workspaceId } = await requireScope();
  if (!STATUSES.includes(to)) return { ok: false, error: "Status tidak valid" };

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: { status: true },
  });
  if (!project) return { ok: false, error: "Project tidak ditemukan" };

  if (!canTransition(project.status, to)) {
    return { ok: false, error: `Status ${project.status} tidak bisa langsung menjadi ${to}` };
  }

  // Cek ulang status di WHERE agar dua klik bersamaan tidak melompati alur.
  const updated = await prisma.project.updateMany({
    where: { id: projectId, workspaceId, status: project.status },
    // Simpan status asal saat diarsipkan agar bisa dipulihkan persis (un-archive).
    data: { status: to, archivedFrom: to === "ARCHIVED" ? project.status : null },
  });
  if (updated.count === 0) return { ok: false, error: "Status sudah berubah, muat ulang halaman" };

  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { ok: true };
}

/** Pulihkan project dari arsip ke status sebelumnya (disesuaikan jika isinya sudah berubah). */
export async function restoreProject(projectId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: { status: true, archivedFrom: true },
  });
  if (!project) return { ok: false, error: "Project tidak ditemukan" };
  if (project.status !== "ARCHIVED") return { ok: false, error: "Project ini tidak sedang diarsipkan" };

  const [quotations, tasks] = await Promise.all([
    prisma.quotation.count({ where: { deletedAt: null, estimation: { projectId } } }),
    prisma.estimationTask.count({ where: { estimation: { projectId } } }),
  ]);
  const target = restoreTarget(project.archivedFrom, { quotation: quotations > 0, tasks: tasks > 0 });

  const updated = await prisma.project.updateMany({
    where: { id: projectId, workspaceId, status: "ARCHIVED" },
    data: { status: target, archivedFrom: null },
  });
  if (updated.count === 0) return { ok: false, error: "Status sudah berubah, muat ulang halaman" };

  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { ok: true };
}

/** Soft delete — baris tetap ada untuk audit trail dan tampil di History (§2). */
export async function deleteProject(projectId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const updated = await prisma.project.updateMany({
    where: { id: projectId, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (updated.count === 0) return { ok: false, error: "Project tidak ditemukan" };

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard");
}

export async function deleteQuotation(quotationId: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const quotation = await prisma.quotation.findFirst({
    where: {
      id: quotationId,
      deletedAt: null,
      estimation: { project: { workspaceId, deletedAt: null } },
    },
    select: { id: true, estimation: { select: { projectId: true, project: { select: { status: true } } } } },
  });
  if (!quotation) return { ok: false, error: "Penawaran tidak ditemukan" };

  const { projectId, project } = quotation.estimation;

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: quotationId }, data: { deletedAt: new Date() } });

    // Tanpa quotation aktif, project yang masih menunggu keputusan kembali ke Analyzed.
    const remaining = await tx.quotation.count({
      where: { deletedAt: null, estimation: { projectId } },
    });
    if (remaining === 0 && project.status === "QUOTED") {
      await tx.project.update({ where: { id: projectId }, data: { status: "ANALYZED" } });
    }
  });

  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/history");
  return { ok: true };
}
