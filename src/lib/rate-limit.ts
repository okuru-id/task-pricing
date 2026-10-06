import { prisma } from "@/lib/prisma";

/** Batas analisis AI per workspace (§4 Security): 20 per jam. */
export const ANALYSIS_LIMIT = 20;
export const ANALYSIS_WINDOW_MS = 60 * 60 * 1000;

export type QuotaDecision = { allowed: true } | { allowed: false; retryAfterMinutes: number };

/** Murni: putuskan dari timestamp analisis dalam window. Slot terlama yang lepas menentukan kapan boleh lagi. */
export function evaluateQuota(
  timestamps: Date[],
  now: Date,
  limit = ANALYSIS_LIMIT,
  windowMs = ANALYSIS_WINDOW_MS,
): QuotaDecision {
  const recent = timestamps
    .filter((t) => now.getTime() - t.getTime() < windowMs)
    .sort((a, b) => a.getTime() - b.getTime());

  if (recent.length < limit) return { allowed: true };

  // Slot yang harus lepas agar jumlah < limit adalah ke-(recent.length - limit + 1) tertua.
  const blocking = recent[recent.length - limit];
  const retryMs = blocking.getTime() + windowMs - now.getTime();
  return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(retryMs / 60_000)) };
}

/**
 * Cek kuota lalu catat satu analisis. Percobaan yang gagal tetap dihitung karena tetap memakai biaya model.
 * Dijalankan dalam transaksi Serializable agar permintaan paralel tidak melewati batas.
 */
export async function consumeAnalysisQuota(workspaceId: string, now = new Date()): Promise<QuotaDecision> {
  return prisma.$transaction(
    async (tx) => {
      const runs = await tx.analysisRun.findMany({
        where: { workspaceId, createdAt: { gt: new Date(now.getTime() - ANALYSIS_WINDOW_MS) } },
        select: { createdAt: true },
      });

      const decision = evaluateQuota(
        runs.map((r) => r.createdAt),
        now,
      );
      if (decision.allowed) await tx.analysisRun.create({ data: { workspaceId } });
      return decision;
    },
    { isolationLevel: "Serializable" },
  );
}
