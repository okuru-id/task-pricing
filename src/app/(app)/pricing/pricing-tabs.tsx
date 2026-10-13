"use client";

import { Briefcase, Tag } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobProfileView } from "@/lib/data/job-profiles";
import type { PricingProfileView } from "@/lib/data/pricing";

import { JobProfileForms } from "./job-profile-forms";
import { PricingForm } from "./pricing-form";

/**
 * Dua daftar yang saling menunjuk, dipisah tab supaya halaman tidak panjang sekaligus
 * tetap jelas urutannya: tarif dibuat dulu, lalu dipasang ke jenis pekerjaan.
 */
export function PricingTabs({
  jobProfiles,
  pricingProfiles,
}: {
  jobProfiles: JobProfileView[];
  pricingProfiles: PricingProfileView[];
}) {
  return (
    <Tabs defaultValue="pekerjaan" className="gap-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="pekerjaan">
          <Briefcase />
          Jenis pekerjaan
          <span className="text-muted-foreground ml-1 text-xs">{jobProfiles.length}</span>
        </TabsTrigger>
        <TabsTrigger value="tarif">
          <Tag />
          Profil harga
          <span className="text-muted-foreground ml-1 text-xs">{pricingProfiles.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pekerjaan">
        <JobProfileForms
          profiles={jobProfiles}
          pricingProfiles={pricingProfiles.map((profile) => ({
            id: profile.id,
            name: profile.name,
            isDefault: profile.isDefault,
          }))}
        />
      </TabsContent>

      <TabsContent value="tarif">
        <PricingForm profiles={pricingProfiles} />
      </TabsContent>
    </Tabs>
  );
}
