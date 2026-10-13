import { JobProfileForms } from "./job-profile-forms";
import { listJobProfiles } from "@/lib/data/job-profiles";
import { getPricingHistory, listPricingProfiles } from "@/lib/data/pricing";
import { formatDate, formatIDR } from "@/lib/format";
import { requireScope } from "@/lib/workspace";

import { JobPricingLink } from "./job-pricing-link";
import { PricingForm } from "./pricing-form";

export default async function PricingPage() {
  const { workspaceId } = await requireScope();
  const [jobProfiles, pricingProfiles, history] = await Promise.all([
    listJobProfiles(workspaceId),
    listPricingProfiles(workspaceId),
    getPricingHistory(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">Profil Pekerjaan & Harga</h1>
        <p className="text-muted-foreground text-[13px]">
          Jenis pekerjaan menentukan cara AI menilai kompleksitas; profil harga menentukan
          tarifnya. Keduanya dikaitkan di halaman ini.
        </p>
      </header>

      <JobProfileForms profiles={jobProfiles} />

      <PricingForm profiles={pricingProfiles} />

      <JobPricingLink
        jobProfiles={jobProfiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          pricingProfileId: profile.pricingProfileId,
        }))}
        pricingProfiles={pricingProfiles}
      />

      <section className="bg-card space-y-3 rounded-[10px] border p-4 lg:p-5">
        <div>
          <h2 className="text-[15px] font-semibold">Riwayat versi harga</h2>
          <p className="text-muted-foreground text-xs">
            Tiap penyimpanan membuat versi baru. Penawaran menyimpan versi yang dipakai saat
            dibuat, jadi angkanya tidak berubah belakangan.
          </p>
        </div>

        {history.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">Belum ada perubahan harga.</p>
        ) : (
          <ul className="space-y-2">
            {history.map(({ version, changedAt, rules }, index) => (
              <li
                key={version}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b pb-2 last:border-0 last:pb-0"
              >
                <span className="text-[13px] font-semibold">
                  Versi {version}
                  {index === 0 && (
                    <span className="bg-primary-soft text-primary ml-2 rounded-md px-1.5 py-0.5 text-[11px] font-medium">
                      aktif
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">{formatDate(changedAt)}</span>
                <span className="text-muted-foreground w-full text-xs tabular-nums">
                  {formatIDR(rules.SIMPLE ?? 0)} · {formatIDR(rules.MEDIUM ?? 0)} ·{" "}
                  {formatIDR(rules.COMPLEX ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
