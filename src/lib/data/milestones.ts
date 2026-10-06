import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sumTasks } from "@/lib/data/projects";

type Tx = Prisma.TransactionClient;

/** Perbarui `milestones.price` (batas bawah: base + min Very Complex) dari task yang tergabung. Panggil setelah tiap perubahan task/milestone. */
export async function syncMilestonePrices(tx: Tx, estimationId: string) {
  const milestones = await tx.milestone.findMany({
    where: { estimationId },
    select: {
      id: true,
      tasks: { select: { price: true, complexity: true, customEstimateMin: true, customEstimateMax: true } },
    },
  });

  for (const milestone of milestones) {
    const value = sumTasks(milestone.tasks);
    await tx.milestone.update({ where: { id: milestone.id }, data: { price: value.base + value.customMin } });
  }
}

/** Milestone + task-nya untuk halaman Milestone, ter-scope workspace. Task tanpa milestone dikembalikan terpisah. */
export async function getMilestoneBoard(estimationId: string) {
  const [milestones, unassigned] = await Promise.all([
    prisma.milestone.findMany({
      where: { estimationId },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        tasks: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            complexity: true,
            price: true,
            customEstimateMin: true,
            customEstimateMax: true,
          },
        },
      },
    }),
    prisma.estimationTask.findMany({
      where: { estimationId, milestoneId: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        complexity: true,
        price: true,
        customEstimateMin: true,
        customEstimateMax: true,
      },
    }),
  ]);

  return { milestones, unassigned };
}

export type BoardTask = Awaited<ReturnType<typeof getMilestoneBoard>>["unassigned"][number];
