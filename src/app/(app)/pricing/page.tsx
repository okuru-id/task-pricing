import { listJobProfiles } from "@/lib/data/job-profiles";
import { listPricingProfiles } from "@/lib/data/pricing";
import { requireScope } from "@/lib/workspace";

import { JobProfileForms } from "./job-profile-forms";
import { PricingForm } from "./pricing-form";

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
        <p className="text-muted-foreground text-[13px]">
          Dua hal yang saling berkaitan, diatur di satu tempat.
        </p>

        {/* Penjelasan singkat di muka: tanpa ini orang harus menebak hubungan kedua daftar. */}
        <ol className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
          <li>
            <span className="text-foreground font-semibold">1.</span> Buat tarif di
            &ldquo;Profil harga&rdquo;
          </li>
          <li>
            <span className="text-foreground font-semibold">2.</span> Pasang tarif itu ke jenis
            pekerjaan
          </li>
          <li>
            <span className="text-foreground font-semibold">3.</span> Estimasi baru memakainya
            otomatis
          </li>
        </ol>
      </header>

      <JobProfileForms
        profiles={jobProfiles}
        pricingProfiles={pricingProfiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          isDefault: profile.isDefault,
        }))}
      />

      <PricingForm profiles={pricingProfiles} />
    </div>
  );
}
