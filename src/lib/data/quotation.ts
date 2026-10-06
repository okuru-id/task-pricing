import { prisma } from "@/lib/prisma";

/** Quotation terbaru sebuah project (ter-scope workspace), beserta branding workspace. Null jika project tak ditemukan. */
export async function getLatestQuotation(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      clientName: true,
      workspace: {
        select: { name: true, companyName: true, address: true, contact: true, bankInfo: true, terms: true },
      },
      estimations: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          quotations: {
            where: { deletedAt: null },
            orderBy: { version: "desc" },
            take: 1,
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!project) return null;
  return { project, quotation: project.estimations[0]?.quotations[0] ?? null };
}
