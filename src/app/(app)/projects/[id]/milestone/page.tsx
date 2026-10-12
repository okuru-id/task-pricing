import { Breadcrumb } from "@/components/breadcrumb";
import { Stepper } from "@/components/stepper";
import { getMilestoneBoard } from "@/lib/data/milestones";
import { getLatestEstimation } from "@/lib/data/estimations";
import { requireScope } from "@/lib/workspace";

import { MilestoneBoard } from "./milestone-board";

export default async function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await params;
  const { project, estimation } = await getLatestEstimation(id, workspaceId);
  const board = await getMilestoneBoard(estimation.id);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Milestone" },
        ]}
      />

      <Stepper current="Milestone" projectId={project.id} />

      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-bold">Milestone</h1>
        <p className="text-muted-foreground text-[13px]">
          {project.name}
          {project.clientName && ` · ${project.clientName}`} · kelompokkan tugas menjadi tahap
          pengerjaan. Opsional — bisa dilewati.
        </p>
      </header>

      <MilestoneBoard projectId={project.id} milestones={board.milestones} unassigned={board.unassigned} />
    </div>
  );
}
