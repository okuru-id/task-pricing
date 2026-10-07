import { COMPLEXITY_LABEL } from "@/lib/labels";
import { getPriceRules, getPricingHistory, getPricingProfileRef } from "@/lib/data/pricing";
import { formatDate, formatIDR } from "@/lib/format";
import { requireScope } from "@/lib/workspace";

import { PricingForm } from "./pricing-form";

const PANDUAN = [
  { key: "SIMPLE", hint: "Perubahan kecil yang polanya sudah jelas: teks, field tambahan, perbaikan tampilan." },
  { key: "MEDIUM", hint: "Satu fitur utuh dengan data sendiri: CRUD, form bertingkat, laporan sederhana." },
  { key: "COMPLEX", hint: "Melibatkan sistem lain atau aturan berlapis: integrasi, peran pengguna, migrasi." },
  { key: "VERY_COMPLEX", hint: "Scope belum pasti atau risikonya besar — harga diisi sebagai rentang per tugas." },
] as const;

export default async function PricingPage() {
  const { workspaceId } = await requireScope();
  const [rules, ref, history] = await Promise.all([
    getPriceRules(workspaceId),
    getPricingProfileRef(workspaceId),
    getPricingHistory(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">Pricing</h1>
        <p className="text-muted-foreground text-[13px]">
          Harga per kompleksitas · versi {ref?.version ?? 1}. Mengubah harga hanya berlaku untuk
          penawaran berikutnya; penawaran lama tetap memakai harga saat dibuat.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <PricingForm initial={{ SIMPLE: rules.SIMPLE ?? 0, MEDIUM: rules.MEDIUM ?? 0, COMPLEX: rules.COMPLEX ?? 0 }} />

        <div className="flex flex-col gap-5">
          <section className="bg-card space-y-3 rounded-[10px] border p-4 lg:p-5">
            <div>
              <h2 className="text-[15px] font-semibold">Kapan memakai tiap tingkat</h2>
              <p className="text-muted-foreground text-xs">
                Acuan agar penilaian AI dan penilaian Anda sendiri tetap konsisten antar project.
              </p>
            </div>

            <ul className="space-y-2.5">
              {PANDUAN.map(({ key, hint }) => (
                <li key={key} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="w-28 shrink-0 text-[13px] font-semibold">
                    {COMPLEXITY_LABEL[key]}
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1 text-xs">{hint}</span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums">
                    {key === "VERY_COMPLEX" ? "rentang" : formatIDR(rules[key] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-card space-y-3 rounded-[10px] border p-4 lg:p-5">
            <div>
              <h2 className="text-[15px] font-semibold">Riwayat versi</h2>
              <p className="text-muted-foreground text-xs">
                Tiap penyimpanan membuat versi baru. Penawaran menyimpan versi yang dipakai saat
                dibuat, jadi angkanya tidak berubah belakangan.
              </p>
            </div>

            {history.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">Belum ada perubahan harga.</p>
            ) : (
              <ul className="space-y-2">
                {history.map(({ version, changedAt, rules: versionRules }, index) => (
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
                      {formatIDR(versionRules.SIMPLE ?? 0)} · {formatIDR(versionRules.MEDIUM ?? 0)} ·{" "}
                      {formatIDR(versionRules.COMPLEX ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
