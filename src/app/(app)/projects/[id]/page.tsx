import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { Stepper } from "@/components/stepper";
import { getLatestEstimation } from "@/lib/data/estimations";
import { getPriceRules } from "@/lib/data/pricing";
import { requireScope } from "@/lib/workspace";

import { TaskReview } from "./task-review";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await params;

  const [{ project, estimation }, rules] = await Promise.all([
    getLatestEstimation(id, workspaceId),
    getPriceRules(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: project.name }]}
      />

      <Stepper current="Review Task" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl leading-tight font-bold">Review Tugas</h1>
          <p className="text-muted-foreground text-[13px]">
            {project.name}
            {project.clientName && ` · ${project.clientName}`} · {estimation.tasks.length}{" "}
            tugas diekstrak AI dari requirement pelanggan
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}/requirement`}
            className="bg-card hover:bg-muted flex h-8 items-center rounded-md border px-3 text-[13px] font-medium"
          >
            Lihat Requirement
          </Link>
          <Link
            href={`/projects/${project.id}/analyze`}
            className="bg-card hover:bg-muted flex h-8 items-center rounded-md border px-3 text-[13px] font-medium"
          >
            Analisis ulang
          </Link>
        </div>
      </header>

      <TaskReview projectId={project.id} tasks={estimation.tasks} rules={rules} />
    </div>
  );
}
