import Link from "next/link";
import { FileDown } from "lucide-react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Stepper } from "@/components/stepper";
import { formatDate } from "@/lib/format";
import { getLatestQuotation } from "@/lib/data/quotation";
import { formatCustomerSummary } from "@/lib/quotation";
import { requireScope } from "@/lib/workspace";
import { notFound } from "next/navigation";

import { ProjectActions } from "../project-actions";
import { CreateQuotationButton, CopySummaryButton, DeleteQuotationButton } from "./quotation-actions";
import { MODES } from "./modes";
import { QuotationView } from "./quotation-view";

export default async function QuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { workspaceId } = await requireScope();
  const { id } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = MODES.find((m) => m.param === modeParam)?.value ?? "DETAILED";

  const found = await getLatestQuotation(id, workspaceId);
  if (!found) notFound();
  const { project, quotation } = found;

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

      <Stepper current="Penawaran" />

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
              href={`/projects/${project.id}/quotation/pdf?mode=${MODES.find((m) => m.value === mode)!.param}`}
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
          <nav className="flex gap-1.5">
            {MODES.map((m) => (
              <Link
                key={m.value}
                href={`/projects/${project.id}/quotation?mode=${m.param}`}
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
    </div>
  );
}
