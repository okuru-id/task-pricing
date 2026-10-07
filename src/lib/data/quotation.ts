import { prisma } from "@/lib/prisma";

/**
 * Quotation sebuah project (ter-scope workspace) beserta branding workspace; null jika project tak ditemukan.
 * Tanpa `version` → versi terbaru. `quotation` null jika belum ada / versi yang diminta tidak ada.
 * `versions` berisi seluruh versi aktif (terbaru dulu) untuk pemilih versi dan perbandingan.
 */
export async function getLatestQuotation(projectId: string, workspaceId: string, version?: number) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
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
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!project) return null;
  const versions = project.estimations[0]?.quotations ?? [];
  const quotation = version === undefined ? (versions[0] ?? null) : (versions.find((q) => q.version === version) ?? null);

  return { project, quotation, versions };
}
