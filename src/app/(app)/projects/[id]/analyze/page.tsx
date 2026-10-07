import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { getResumableJob } from "@/lib/ai/job";
import { describeIncompleteConfig, getAiConfigView } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

import { AnalysisProgress } from "./analysis-progress";

export default async function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await params;

  // Scope workspace: project tenant lain tampil sebagai 404 (§4 Security).
  const project = await prisma.project.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: {
      id: true,
      name: true,
      clientName: true,
      estimations: { orderBy: { version: "desc" }, take: 1, select: { id: true } },
    },
  });

  if (!project) notFound();

  // Analisis yang berhenti di tengah (gagal / tab ditutup) bisa dilanjutkan dari tahap yang tertunda.
  const estimationId = project.estimations[0]?.id;
  const resumable = estimationId ? await getResumableJob(estimationId, workspaceId) : null;
  const aiProblem = describeIncompleteConfig(await getAiConfigView(workspaceId));

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Analisis" },
        ]}
      />

      <header className="space-y-1">
        <p className="text-muted-foreground text-xs">
          {project.name}
          {project.clientName && ` · ${project.clientName}`}
        </p>
        <h1 className="text-[22px] leading-tight font-bold">Menganalisis kebutuhan…</h1>
        <p className="text-muted-foreground text-[13px]">
          AI membaca requirement klien dalam beberapa tahap. Tiap tahap disimpan, jadi bila gagal Anda bisa melanjutkan tanpa mengulang dari awal.
        </p>
      </header>

      <AnalysisProgress
        projectId={project.id}
        aiProblem={aiProblem}
        resume={resumable && { jobId: resumable.id, stage: resumable.stage, error: resumable.error }}
      />
    </div>
  );
}
