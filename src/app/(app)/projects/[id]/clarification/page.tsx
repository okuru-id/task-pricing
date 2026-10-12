import { Breadcrumb } from "@/components/breadcrumb";
import { Stepper } from "@/components/stepper";
import { getLatestEstimation } from "@/lib/data/estimations";
import { requireScope } from "@/lib/workspace";

import { ClarificationList } from "./clarification-list";

export default async function ClarificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await params;
  const { project, estimation } = await getLatestEstimation(id, workspaceId);

  const tasks = estimation.tasks.map((task) => ({
    id: task.id,
    name: task.name,
    complexity: task.complexity,
    confidence: task.confidence,
    questions: task.clarificationQuestions,
  }));

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Klarifikasi" },
        ]}
      />

      <Stepper current="Klarifikasi" projectId={project.id} />

      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-bold">Klarifikasi Pelanggan</h1>
        <p className="text-muted-foreground text-[13px]">
          {project.name}
          {project.clientName && ` · ${project.clientName}`} · pertanyaan yang perlu dijawab
          pelanggan sebelum penawaran dikirim
        </p>
      </header>

      <ClarificationList projectId={project.id} tasks={tasks} />
    </div>
  );
}
