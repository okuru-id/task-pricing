import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

import { AnalysisProgress } from "./analysis-progress";

export default async function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await params;

  // Scope workspace: project tenant lain tampil sebagai 404 (§4 Security).
  const project = await prisma.project.findFirst({
    where: { id, workspaceId, deletedAt: null },
    select: { id: true, name: true, clientName: true },
  });

  if (!project) notFound();

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
          AI sedang membaca requirement klien. Biasanya selesai dalam kurang dari satu menit.
        </p>
      </header>

      <AnalysisProgress projectId={project.id} />
    </div>
  );
}
