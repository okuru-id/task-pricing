import { Breadcrumb } from "@/components/breadcrumb";
import { getLatestEstimation } from "@/lib/data/estimations";
import { requireScope } from "@/lib/workspace";

export default async function RequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId } = await requireScope();
  const { id } = await params;
  const { project, estimation } = await getLatestEstimation(id, workspaceId);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Requirement" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold">Requirement asli</h1>
        <p className="text-muted-foreground text-[13px]">
          Versi {estimation.version} · {estimation.requirement.length} karakter. Setiap tugas
          AI harus bisa ditelusuri ke teks ini.
        </p>
      </header>

      <pre className="bg-card rounded-[10px] border p-5 text-[13px] leading-relaxed whitespace-pre-wrap">
        {estimation.requirement}
      </pre>
    </div>
  );
}
