import type { ProjectStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Semua fungsi di modul ini WAJIB menerima workspaceId dan memakainya sebagai filter (§4). */

const latestEstimation = {
  orderBy: { version: "desc" } as const,
  take: 1,
  select: {
    id: true,
    tasks: {
      select: { price: true, customEstimateMin: true, customEstimateMax: true, complexity: true },
    },
  },
};

export interface ProjectValue {
  base: number;
  customMin: number;
  customMax: number;
}

type TaskPrices = {
  price: number;
  customEstimateMin: number | null;
  customEstimateMax: number | null;
  complexity: string;
}[];

/** Base total = task non-custom. Custom range dipisah agar tidak dicampur jadi angka tunggal (§2). */
export function sumTasks(tasks: TaskPrices): ProjectValue {
  return tasks.reduce<ProjectValue>(
    (acc, task) => {
      if (task.complexity === "VERY_COMPLEX") {
        acc.customMin += task.customEstimateMin ?? 0;
        acc.customMax += task.customEstimateMax ?? 0;
      } else {
        acc.base += task.price;
      }
      return acc;
    },
    { base: 0, customMin: 0, customMax: 0 },
  );
}

const emptyValue = (): ProjectValue => ({ base: 0, customMin: 0, customMax: 0 });

function addValue(acc: ProjectValue, value: ProjectValue): ProjectValue {
  acc.base += value.base;
  acc.customMin += value.customMin;
  acc.customMax += value.customMax;
  return acc;
}

export const PROJECT_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;

export async function listProjects(
  workspaceId: string,
  status?: ProjectStatus,
  page = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  // Tanpa filter, project Archived disembunyikan dari dashboard (tetap ada di History).
  const where = {
    workspaceId,
    deletedAt: null,
    ...(status ? { status } : { status: { not: "ARCHIVED" as const } }),
  };

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        updatedAt: true,
        estimations: latestEstimation,
      },
    }),
  ]);

  return {
    total,
    projects: projects.map((project) => ({
      ...project,
      estimationId: project.estimations[0]?.id ?? null,
      value: sumTasks(project.estimations[0]?.tasks ?? []),
    })),
  };
}

const ACTIVE_STATUSES: ProjectStatus[] = ["DRAFT", "ANALYZED", "QUOTED"];

export async function getDashboardStats(workspaceId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const chartStart = new Date(monthStart);
  chartStart.setMonth(chartStart.getMonth() - 5);

  const [grouped, projects] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { workspaceId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      select: { status: true, createdAt: true, estimations: latestEstimation },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    grouped.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<ProjectStatus, number>>;

  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);

  const valued = projects.map((project) => ({
    status: project.status,
    createdAt: project.createdAt,
    value: sumTasks(project.estimations[0]?.tasks ?? []),
  }));

  // Estimasi pendapatan bulan ini: project Quoted/Accepted yang dibuat bulan berjalan.
  const revenue = valued
    .filter(
      (p) =>
        (p.status === "QUOTED" || p.status === "ACCEPTED") && p.createdAt >= monthStart,
    )
    .reduce((acc, project) => addValue(acc, project.value), emptyValue());

  const activeCount = valued.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const awaitingCount = countByStatus.QUOTED ?? 0;

  const accepted = countByStatus.ACCEPTED ?? 0;
  const decided = accepted + (countByStatus.REJECTED ?? 0);
  const acceptanceRate = decided > 0 ? Math.round((accepted / decided) * 100) : null;

  const withValue = valued.filter((p) => p.value.base > 0);
  const averageValue =
    withValue.length > 0
      ? Math.round(withValue.reduce((sum, p) => sum + p.value.base, 0) / withValue.length)
      : 0;

  // Chart 6 bulan terakhir — hanya project Accepted (§ label design).
  const months: { label: string; total: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(chartStart);
    start.setMonth(chartStart.getMonth() + i);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const monthTotal = valued
      .filter((p) => p.status === "ACCEPTED" && p.createdAt >= start && p.createdAt < end)
      .reduce((sum, p) => sum + p.value.base, 0);

    months.push({
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(start),
      total: monthTotal,
    });
  }

  return {
    countByStatus,
    total,
    revenue,
    activeCount,
    awaitingCount,
    acceptanceRate,
    accepted,
    decided,
    averageValue,
    months,
  };
}
