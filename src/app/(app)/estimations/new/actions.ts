"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

const draftSchema = z.object({
  projectId: z.string().nullable(),
  name: z.string().trim().max(200),
  clientName: z.string().trim().max(200),
  requirement: z.string().max(100_000),
});

export type DraftInput = z.infer<typeof draftSchema>;

/**
 * Upsert draft project + estimation v1. Dipanggil autosave tiap 10 detik dan
 * saat user menekan "Simpan draft". Selalu ter-scope ke workspace aktif (§4).
 */
export async function saveDraft(input: DraftInput): Promise<{ projectId: string }> {
  const { workspaceId } = await requireScope();
  const data = draftSchema.parse(input);
  const name = data.name || "Estimasi tanpa judul";

  if (data.projectId) {
    // updateMany + filter workspaceId: project tenant lain tidak akan tersentuh.
    const updated = await prisma.project.updateMany({
      where: { id: data.projectId, workspaceId, deletedAt: null },
      data: { name, clientName: data.clientName || null },
    });

    if (updated.count > 0) {
      await prisma.estimation.updateMany({
        where: { projectId: data.projectId, version: 1 },
        data: { requirement: data.requirement },
      });
      return { projectId: data.projectId };
    }
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name,
      clientName: data.clientName || null,
      status: "DRAFT",
      estimations: { create: { requirement: data.requirement } },
    },
    select: { id: true },
  });

  return { projectId: project.id };
}

export async function analyze(input: DraftInput): Promise<void> {
  const { projectId } = await saveDraft(input);
  redirect(`/projects/${projectId}/analyze`);
}
