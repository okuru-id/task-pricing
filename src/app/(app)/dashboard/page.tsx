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
import { formatIDR, formatIDRShort, formatRange, formatRelativeDay } from "@/lib/format";
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
          <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">{greeting()} 👋</h1>
          <p className="text-muted-foreground text-[13px]">
            {today} · {stats.awaitingCount} quotation menunggu keputusan klien
          </p>
        </div>
        {/* Di mobile aksi ini sudah tersedia sebagai tombol melayang (lihat Sidebar). */}
        <Link
          href="/estimations/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hidden h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium lg:flex"
        >
          <Plus className="size-4" />
          New Estimation
        </Link>
      </header>

      {/*
        Mobile mengikuti design "Dashboard - Mobile": pendapatan jadi kartu utama berlatar
        primary, tiga KPI sisanya mengecil dan berjajar. `sm:contents` membuat pembungkus
        itu lenyap di layar lebar sehingga grid 4 kolom tetap seperti semula.
      */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hero
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

        <div className="grid grid-cols-3 gap-3 sm:contents">
        <KpiCard
          compact
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
          compact
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
          compact
          label="Rata-rata nilai project"
          value={formatIDR(stats.averageValue)}
          shortValue={formatIDRShort(stats.averageValue)}
          icon={<TrendingUp className="text-primary size-4" />}
          iconClass="bg-primary-soft"
          pill={{
            text: `${stats.total} project total`,
            class: "bg-muted text-muted-foreground",
          }}
        />
        </div>
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

      {/* Mobile: tabel 5 kolom tidak terbaca di 375px — daftar kartu sesuai design mobile. */}
      <section className="flex flex-col gap-3 sm:hidden">
        {projects.length === 0 && (
          <p className="text-muted-foreground bg-card rounded-xl border p-6 text-center text-[13px]">
            Belum ada project.{" "}
            <Link href="/estimations/new" className="text-primary font-medium">
              Buat estimasi pertama
            </Link>
          </p>
        )}

        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="bg-card flex flex-col gap-1.5 rounded-xl border p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {project.name}
              </span>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground truncate text-xs">
                {project.clientName ?? "Tanpa klien"} · {formatRelativeDay(project.updatedAt)}
              </span>
              <span className="text-[13px] font-semibold tabular-nums">
                {formatIDR(project.value.base)}
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="bg-card hidden overflow-hidden rounded-[10px] border sm:block">
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

/**
 * `hero` dan `compact` hanya berlaku di bawah breakpoint sm — di layar lebar keempat kartu
 * tetap identik seperti design desktop.
 */
function KpiCard({
  label,
  value,
  icon,
  iconClass,
  pill,
  hero,
  shortValue,
  compact,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  pill: { text: string; class: string };
  hero?: boolean;
  /** Nilai ringkas untuk kolom sempit di mobile (mis. "Rp18,6 jt"). */
  shortValue?: string;
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-[14px] [--card-spacing:--spacing(5)]",
        hero && "max-sm:bg-primary max-sm:border-transparent",
        compact && "max-sm:rounded-xl max-sm:[--card-spacing:--spacing(3)]",
      )}
    >
      <CardContent className={cn("flex flex-col gap-3.5", compact && "max-sm:gap-1")}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-muted-foreground text-xs font-medium",
              hero && "max-sm:text-primary-fg-muted max-sm:text-[13px]",
              compact && "max-sm:order-2 max-sm:text-[11px]",
            )}
          >
            {label}
          </p>
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconClass,
              compact && "max-sm:hidden",
            )}
          >
            {icon}
          </div>
        </div>
        <p
          className={cn(
            "text-[28px] leading-none font-bold tabular-nums",
            hero && "max-sm:text-primary-foreground",
            compact && "max-sm:order-1 max-sm:text-base",
          )}
        >
          {shortValue ? (
            <>
              <span className="sm:hidden">{shortValue}</span>
              <span className="hidden sm:inline">{value}</span>
            </>
          ) : (
            value
          )}
        </p>
        <span
          className={cn(
            "w-fit rounded-[10px] px-2 py-0.5 text-xs font-semibold",
            pill.class,
            hero && "max-sm:bg-white/15 max-sm:text-primary-foreground",
            compact && "max-sm:hidden",
          )}
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
        "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium lg:px-2.5 lg:py-1.5",
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
