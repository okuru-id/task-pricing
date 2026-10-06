import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { BadgeCheck, FolderOpen, Plus, TrendingUp, Wallet } from "lucide-react";

import { STATUS_DOT, StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardStats, listProjects } from "@/lib/data/projects";
import { formatIDR, formatRange, formatRelativeDay } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { requireScope } from "@/lib/workspace";

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];
const PIPELINE: ProjectStatus[] = ["DRAFT", "ANALYZED", "QUOTED", "ACCEPTED", "REJECTED"];

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { workspaceId } = await requireScope();
  const { status } = await searchParams;

  const activeStatus = STATUSES.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : undefined;

  const [projects, stats] = await Promise.all([
    listProjects(workspaceId, activeStatus),
    getDashboardStats(workspaceId),
  ]);

  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date());
  const pipelineTotal = PIPELINE.reduce((sum, s) => sum + (stats.countByStatus[s] ?? 0), 0);
  const chartMax = Math.max(...stats.months.map((m) => m.total), 1);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[26px] leading-tight font-bold">{greeting()} 👋</h1>
          <p className="text-muted-foreground text-[13px]">
            {today} · {stats.awaitingCount} quotation menunggu keputusan klien
          </p>
        </div>
        <Link
          href="/estimations/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium"
        >
          <Plus className="size-4" />
          New Estimation
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estimasi pendapatan bulan ini"
          value={formatIDR(stats.revenue.base)}
          icon={<Wallet className="text-primary size-4" />}
          iconClass="bg-primary-soft"
          pill={
            stats.revenue.customMax > 0
              ? {
                  text: `+ custom ${formatRange(stats.revenue.customMin, stats.revenue.customMax)}`,
                  class: "bg-primary-soft text-primary",
                }
              : { text: "Quoted + Accepted", class: "bg-muted text-muted-foreground" }
          }
        />
        <KpiCard
          label="Project aktif"
          value={String(stats.activeCount)}
          icon={<FolderOpen className="text-warning size-4" />}
          iconClass="bg-warning-soft"
          pill={{
            text: `${stats.awaitingCount} menunggu respons`,
            class: "bg-muted text-muted-foreground",
          }}
        />
        <KpiCard
          label="Tingkat diterima"
          value={stats.acceptanceRate === null ? "—" : `${stats.acceptanceRate}%`}
          icon={<BadgeCheck className="text-success size-4" />}
          iconClass="bg-success-soft"
          pill={{
            text:
              stats.decided > 0
                ? `${stats.accepted} dari ${stats.decided} keputusan`
                : "Belum ada keputusan",
            class:
              stats.decided > 0
                ? "bg-success-soft text-success"
                : "bg-muted text-muted-foreground",
          }}
        />
        <KpiCard
          label="Rata-rata nilai project"
          value={formatIDR(stats.averageValue)}
          icon={<TrendingUp className="text-primary size-4" />}
          iconClass="bg-primary-soft"
          pill={{
            text: `${stats.total} project total`,
            class: "bg-muted text-muted-foreground",
          }}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-[14px] [--card-spacing:--spacing(5)]">
          <CardContent className="flex flex-col gap-3.5">
            <div>
              <h2 className="text-[15px] font-semibold">Estimasi pendapatan</h2>
              <p className="text-muted-foreground text-xs">
                6 bulan terakhir, project Accepted
              </p>
            </div>
            <div className="flex h-[92px] items-end gap-4">
            {stats.months.map((month, index) => {
              const isLast = index === stats.months.length - 1;
              return (
                <div key={month.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-full rounded-t-md",
                      isLast ? "bg-primary" : "bg-primary-soft",
                    )}
                    style={{ height: `${Math.max((month.total / chartMax) * 70, 4)}px` }}
                    title={formatIDR(month.total)}
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      isLast ? "text-foreground font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {month.label}
                  </span>
                </div>
              );
            })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[14px] [--card-spacing:--spacing(5)]">
          <CardContent className="flex flex-col gap-3.5">
            <h2 className="text-[15px] font-semibold">Pipeline per status</h2>

            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {PIPELINE.map((s) => {
              const count = stats.countByStatus[s] ?? 0;
              if (pipelineTotal === 0) return null;
              return (
                <div
                  key={s}
                  className={STATUS_DOT[s]}
                  style={{ width: `${(count / pipelineTotal) * 100}%` }}
                />
              );
            })}
            {pipelineTotal === 0 && <div className="bg-muted w-full" />}
          </div>

          <ul className="flex flex-col gap-2">
            {PIPELINE.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[13px]">
                <span className={cn("size-2 rounded-full", STATUS_DOT[s])} />
                <span className="flex-1">{STATUS_LABEL[s]}</span>
                <span className="font-semibold">{stats.countByStatus[s] ?? 0}</span>
              </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <nav className="flex flex-wrap gap-1.5">
        <FilterPill href="/dashboard" label="Semua" count={stats.total} active={!activeStatus} />
        {STATUSES.map((value) => (
          <FilterPill
            key={value}
            href={`/dashboard?status=${value}`}
            label={STATUS_LABEL[value]}
            count={stats.countByStatus[value] ?? 0}
            active={activeStatus === value}
          />
        ))}
      </nav>

      <section className="bg-card overflow-hidden rounded-[10px] border">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead>Proyek</TableHead>
              <TableHead className="w-44">Klien</TableHead>
              <TableHead className="w-38">Nilai</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Diperbarui</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                  Belum ada project.{" "}
                  <Link
                    href="/estimations/new"
                    className="text-primary font-medium hover:underline"
                  >
                    Buat estimasi pertama
                  </Link>
                </TableCell>
              </TableRow>
            )}

            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="text-[13px] font-semibold">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-[13px]">
                  {project.clientName ?? "—"}
                </TableCell>
                <TableCell className="text-[13px] font-medium tabular-nums">
                  {formatIDR(project.value.base)}
                  {project.value.customMax > 0 && (
                    <span className="text-muted-foreground block text-[11px]">
                      + {formatRange(project.value.customMin, project.value.customMax)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-[13px]">
                  {formatRelativeDay(project.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconClass,
  pill,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  pill: { text: string; class: string };
}) {
  return (
    <Card className="rounded-[14px] [--card-spacing:--spacing(5)]">
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconClass,
            )}
          >
            {icon}
          </div>
        </div>
        <p className="text-[28px] leading-none font-bold tabular-nums">{value}</p>
        <span
          className={cn("w-fit rounded-[10px] px-2 py-0.5 text-xs font-semibold", pill.class)}
        >
          {pill.text}
        </span>
      </CardContent>
    </Card>
  );
}

function FilterPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium",
        active
          ? "bg-foreground text-background"
          : "bg-card hover:border-border-strong border",
      )}
    >
      {label}
      <span className={active ? "text-text-muted" : "text-muted-foreground font-normal"}>
        {count}
      </span>
    </Link>
  );
}
