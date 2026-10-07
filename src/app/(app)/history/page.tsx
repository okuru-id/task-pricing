import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";

import { StatusBadge } from "@/components/status-badge";
import { listHistory } from "@/lib/data/history";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { formatTotal } from "@/lib/quotation";
import { cn } from "@/lib/utils";
import { requireScope } from "@/lib/workspace";

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; deleted?: string }>;
}) {
  const { workspaceId } = await requireScope();
  const params = await searchParams;

  const status = STATUSES.includes(params.status as ProjectStatus)
    ? (params.status as ProjectStatus)
    : undefined;
  const includeDeleted = params.deleted === "1";

  const projects = await listHistory(workspaceId, { status, includeDeleted });

  const href = (next: { status?: string; deleted?: boolean }) => {
    const query = new URLSearchParams();
    if (next.status) query.set("status", next.status);
    if (next.deleted) query.set("deleted", "1");
    const qs = query.toString();
    return qs ? `/history?${qs}` : "/history";
  };

  const pill = (active: boolean) =>
    cn(
      "rounded-full px-3 py-2 text-xs font-medium lg:px-2.5 lg:py-1.5",
      active ? "bg-foreground text-background" : "bg-card hover:border-border-strong border",
    );

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">History</h1>
        <p className="text-muted-foreground text-[13px]">
          Seluruh project dan versi penawarannya, termasuk yang diarsipkan atau dihapus.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-1.5">
        <Link href={href({ deleted: includeDeleted })} className={pill(!status)}>
          Semua
        </Link>
        {STATUSES.map((value) => (
          <Link key={value} href={href({ status: value, deleted: includeDeleted })} className={pill(status === value)}>
            {STATUS_LABEL[value]}
          </Link>
        ))}
        <span className="flex-1" />
        <Link href={href({ status, deleted: !includeDeleted })} className={pill(includeDeleted)}>
          {includeDeleted ? "Sembunyikan yang dihapus" : "Tampilkan yang dihapus"}
        </Link>
      </nav>

      {projects.length === 0 && (
        <div className="bg-card text-muted-foreground rounded-[10px] border p-10 text-center text-[13px]">
          Belum ada riwayat.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {projects.map((project) => {
          const quotations = project.estimations.flatMap((e) => e.quotations);

          return (
            <li key={project.id} className="bg-card space-y-3 rounded-[10px] border p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {project.deletedAt ? (
                  <span className="text-muted-foreground text-sm font-semibold line-through">{project.name}</span>
                ) : (
                  <Link href={`/projects/${project.id}`} className="text-sm font-semibold hover:underline">
                    {project.name}
                  </Link>
                )}
                <StatusBadge status={project.status} />
                {project.deletedAt && (
                  <span className="text-danger text-[11px] font-medium">
                    Dihapus {formatDate(project.deletedAt)}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  {project.clientName ?? "Tanpa klien"} · dibuat {formatDate(project.createdAt)}
                </span>
              </div>

              {quotations.length === 0 ? (
                <p className="text-muted-foreground text-xs">Belum ada penawaran.</p>
              ) : (
                <ul className="divide-y text-[13px]">
                  {quotations.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className={cn(q.deletedAt && "text-muted-foreground line-through")}>
                        Penawaran v{q.version} · {formatDate(q.generatedAt)}
                        {q.deletedAt && " · dihapus"}
                      </span>
                      <span className="font-medium tabular-nums">{formatTotal(q)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
