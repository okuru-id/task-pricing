import type { ProjectStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Riwayat lengkap project beserta versi quotation-nya. Entri soft-deleted tetap bisa ditampilkan (audit trail). */
export async function listHistory(
  workspaceId: string,
  opts: { status?: ProjectStatus; includeDeleted?: boolean } = {},
) {
  return prisma.project.findMany({
    where: {
      workspaceId,
      ...(opts.includeDeleted ? {} : { deletedAt: null }),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      estimations: {
        select: {
          quotations: {
            orderBy: { generatedAt: "desc" },
            select: { id: true, version: true, total: true, totalMax: true, generatedAt: true, deletedAt: true },
          },
        },
      },
    },
  });
}
