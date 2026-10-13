"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PricingProfileView } from "@/lib/data/pricing";

import { linkJobToPricing } from "./actions";

const NONE = "__default__";

/**
 * Penghubung dua profil: jenis pekerjaan menentukan cara AI menilai, profil harga
 * menentukan tarifnya. Di sinilah keduanya dikaitkan supaya estimasi fotografi otomatis
 * memakai tarif fotografi.
 */
export function JobPricingLink({
  jobProfiles,
  pricingProfiles,
}: {
  jobProfiles: { id: string; name: string; pricingProfileId: string | null }[];
  pricingProfiles: PricingProfileView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (jobProfileId: string, value: string | null) =>
    startTransition(async () => {
      const result = await linkJobToPricing(jobProfileId, value === NONE || !value ? null : value);
      if (result.ok) {
        toast.success("Tarif jenis pekerjaan diperbarui");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const items = {
    [NONE]: "Pakai profil harga default",
    ...Object.fromEntries(pricingProfiles.map((profile) => [profile.id, profile.name])),
  };

  return (
    <section className="bg-card space-y-4 rounded-[10px] border p-4 lg:p-5">
      <div>
        <h2 className="text-[15px] font-semibold">Tarif tiap jenis pekerjaan</h2>
        <p className="text-muted-foreground text-xs">
          Estimasi baru memakai tarif ini begitu jenis pekerjaannya dipilih — masih bisa
          diganti per estimasi bila klien tertentu punya kesepakatan sendiri.
        </p>
      </div>

      {jobProfiles.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">Belum ada jenis pekerjaan.</p>
      ) : (
        <ul className="space-y-3">
          {jobProfiles.map((job) => (
            <li key={job.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 text-[13px] font-medium">{job.name}</span>
              <Select
                items={items}
                value={job.pricingProfileId ?? NONE}
                onValueChange={(value) => change(job.id, value)}
              >
                <SelectTrigger
                  disabled={pending}
                  className="bg-card w-full text-[13px] data-[size=default]:h-10 sm:w-64 lg:data-[size=default]:h-9"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(items).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
