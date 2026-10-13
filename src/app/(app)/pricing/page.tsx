import { listJobProfiles } from "@/lib/data/job-profiles";
import { listPricingProfiles } from "@/lib/data/pricing";
import { requireScope } from "@/lib/workspace";

import { PricingTabs } from "./pricing-tabs";

export default async function PricingPage() {
  const { workspaceId } = await requireScope();
  const [jobProfiles, pricingProfiles] = await Promise.all([
    listJobProfiles(workspaceId),
    listPricingProfiles(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-2">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">
          Jenis Pekerjaan &amp; Tarif
        </h1>

        {/*
          Urutan mengikuti cara orang berpikir: jenis pekerjaan lebih dulu, tarif adalah
          atribut miliknya — sama seperti di form estimasi, memilih jenis pekerjaan yang
          membawa tarifnya, bukan sebaliknya.
        */}
        <ol className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
          <li>
            <span className="text-foreground font-semibold">1.</span> Buat jenis pekerjaan
            Anda
          </li>
          <li>
            <span className="text-foreground font-semibold">2.</span> Tentukan tarifnya di tab
            &ldquo;Profil harga&rdquo;
          </li>
          <li>
            <span className="text-foreground font-semibold">3.</span> Pasang tarif itu pada
            jenis pekerjaannya
          </li>
        </ol>
      </header>

      <PricingTabs jobProfiles={jobProfiles} pricingProfiles={pricingProfiles} />
    </div>
  );
}
