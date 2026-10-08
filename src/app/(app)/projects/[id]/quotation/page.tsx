import Link from "next/link";
import { FileDown } from "lucide-react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Stepper } from "@/components/stepper";
import { StepNav } from "@/components/step-nav";
import { formatDate } from "@/lib/format";
import { getLatestQuotation } from "@/lib/data/quotation";
import { formatCustomerSummary, formatTotal } from "@/lib/quotation";
import { requireScope } from "@/lib/workspace";
import { notFound } from "next/navigation";

import { ProjectActions } from "../project-actions";
import { CreateQuotationButton, CopySummaryButton, DeleteQuotationButton } from "./quotation-actions";
import { MODES } from "./modes";
import { QuotationDiffPanel } from "./quotation-diff-panel";
import { QuotationView } from "./quotation-view";

export default async function QuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; v?: string; compare?: string }>;
}) {
  const { workspaceId } = await requireScope();
  const { id } = await params;
  const query = await searchParams;
  const mode = MODES.find((m) => m.param === query.mode)?.value ?? "DETAILED";

  const positive = (value?: string) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  const requested = positive(query.v);

  const found = await getLatestQuotation(id, workspaceId, requested);
  if (!found) notFound();
  const { project, quotation, versions } = found;
  // Versi yang diminta tapi tidak ada (mis. sudah dihapus) → 404, bukan diam-diam menampilkan versi lain.
  if (requested !== undefined && !quotation) notFound();

  const latestVersion = versions[0]?.version;
  const compareVersion = positive(query.compare);
  const baseline =
    quotation && compareVersion !== undefined && compareVersion !== quotation.version
      ? versions.find((q) => q.version === compareVersion)
      : undefined;

  /** Pertahankan mode & versi yang sedang dilihat saat berpindah link. */
  const href = (next: { mode?: string; v?: number; compare?: number | null }) => {
    const params = new URLSearchParams();
    const modeValue = next.mode ?? MODES.find((m) => m.value === mode)!.param;
    if (modeValue !== "detailed") params.set("mode", modeValue);
    const version = next.v ?? quotation?.version;
    if (version !== undefined && version !== latestVersion) params.set("v", String(version));
    if (next.compare) params.set("compare", String(next.compare));
    const qs = params.toString();
    return `/projects/${project.id}/quotation${qs ? `?${qs}` : ""}`;
  };

  const summaryText = quotation
    ? formatCustomerSummary({
        clientName: project.clientName,
        projectName: project.name,
        items: quotation.items,
        total: quotation.total,
        totalMax: quotation.totalMax,
        assumptions: quotation.assumptions,
        exclusions: quotation.exclusions,
      })
    : "";

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Penawaran" },
        ]}
      />

      <Stepper current="Penawaran" projectId={project.id} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl leading-tight font-bold">Penawaran</h1>
          <p className="text-muted-foreground text-[13px]">
            {project.name}
            {project.clientName && ` · ${project.clientName}`}
            {quotation && ` · versi ${quotation.version} · dibuat ${formatDate(quotation.generatedAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {quotation && <CopySummaryButton text={summaryText} />}
          {quotation && (
            <a
              href={`/projects/${project.id}/quotation/pdf?mode=${MODES.find((m) => m.value === mode)!.param}&v=${quotation.version}`}
              className="bg-card hover:bg-muted flex h-7 items-center gap-1 rounded-md border px-2.5 text-[0.8rem] font-medium"
            >
              <FileDown className="size-3.5" />
              Unduh PDF
            </a>
          )}
          <CreateQuotationButton projectId={project.id} hasExisting={!!quotation} />
          {quotation && <DeleteQuotationButton quotationId={quotation.id} />}
        </div>
      </header>

      <ProjectActions projectId={project.id} status={project.status} />

      {!quotation ? (
        <div className="bg-card text-muted-foreground rounded-[10px] border p-10 text-center text-[13px]">
          Belum ada penawaran. Klik “Buat penawaran” untuk membekukan harga saat ini.
        </div>
      ) : (
        <>
          {versions.length > 1 && (
            <section className="bg-card space-y-2.5 rounded-[10px] border p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground mr-1 text-xs font-semibold">VERSI</span>
                {versions.map((q) => (
                  <Link
                    key={q.id}
                    href={href({ v: q.version, compare: null })}
                    className={
                      q.version === quotation.version
                        ? "bg-foreground text-background rounded-full px-2.5 py-1 text-xs font-medium"
                        : "hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium"
                    }
                    title={`${formatDate(q.generatedAt)} · ${formatTotal(q)}`}
                  >
                    v{q.version}
                    {q.version === latestVersion && " · terbaru"}
                  </Link>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground mr-1 text-xs font-semibold">BANDINGKAN DENGAN</span>
                {versions
                  .filter((q) => q.version !== quotation.version)
                  .map((q) => (
                    <Link
                      key={q.id}
                      href={href({ compare: baseline?.version === q.version ? null : q.version })}
                      className={
                        baseline?.version === q.version
                          ? "bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-medium"
                          : "hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium"
                      }
                    >
                      v{q.version}
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {baseline && (
            <QuotationDiffPanel
              before={{ version: baseline.version, data: baseline }}
              after={{ version: quotation.version, data: quotation }}
            />
          )}

          <nav className="flex gap-1.5">
            {MODES.map((m) => (
              <Link
                key={m.value}
                href={href({ mode: m.param })}
                className={
                  m.value === mode
                    ? "bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-[13px] font-medium"
                    : "bg-card hover:bg-muted rounded-md border px-3 py-1.5 text-[13px] font-medium"
                }
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <QuotationView mode={mode} quotation={quotation} />
        </>
      )}

      <StepNav
        backHref={`/projects/${project.id}/clarification`}
        backLabel="Kembali ke Klarifikasi"
      />
    </div>
  );
}
