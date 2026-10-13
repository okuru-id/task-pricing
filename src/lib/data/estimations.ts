import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

/** Muat estimation terbaru sebuah project, selalu ter-scope workspace (§4). */
export async function getLatestEstimation(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      // Tipe task yang boleh dipakai project ini — milik profil pekerjaannya.
      jobProfile: {
        select: {
          id: true,
          name: true,
          taskTypes: { orderBy: { order: "asc" }, select: { code: true, label: true } },
        },
      },
      estimations: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          id: true,
          requirement: true,
          version: true,
          tasks: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              priority: true,
              type: true,
              complexity: true,
              reason: true,
              confidence: true,
              price: true,
              customEstimateMin: true,
              customEstimateMax: true,
              edited: true,
              breakdowns: { orderBy: { order: "asc" }, select: { id: true, description: true } },
              flags: { select: { flag: true } },
              clarificationQuestions: { select: { id: true, question: true } },
            },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const estimation = project.estimations[0];
  if (!estimation) notFound();

  return { project, estimation };
}

export type EstimationTaskView = Awaited<
  ReturnType<typeof getLatestEstimation>
>["estimation"]["tasks"][number];
