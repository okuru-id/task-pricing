import { Breadcrumb } from "@/components/breadcrumb";
import { listJobProfileOptions } from "@/lib/data/job-profiles";
import { listPricingProfiles } from "@/lib/data/pricing";
import { requireScope } from "@/lib/workspace";

import { EstimationForm } from "./estimation-form";

export default async function NewEstimationPage() {
  const { workspaceId } = await requireScope();
  const [jobProfiles, pricingProfiles] = await Promise.all([
    listJobProfileOptions(workspaceId),
    listPricingProfiles(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Estimasi Baru" }]} />

      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold">Estimasi Baru</h1>
        <p className="text-muted-foreground text-[13px]">
          Tempel kebutuhan klien, AI akan memecahnya menjadi daftar tugas. Harga dihitung
          oleh mesin harga aplikasi, bukan AI.
        </p>
      </header>

      <EstimationForm jobProfiles={jobProfiles} pricingProfiles={pricingProfiles} />
    </div>
  );
}
