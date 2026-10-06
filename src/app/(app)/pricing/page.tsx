import { getPriceRules, getPricingProfileRef } from "@/lib/data/pricing";
import { requireScope } from "@/lib/workspace";

import { PricingForm } from "./pricing-form";

export default async function PricingPage() {
  const { workspaceId } = await requireScope();
  const [rules, ref] = await Promise.all([getPriceRules(workspaceId), getPricingProfileRef(workspaceId)]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[26px] leading-tight font-bold">Pricing</h1>
        <p className="text-muted-foreground text-[13px]">
          Harga per kompleksitas · versi {ref?.version ?? 1}. Mengubah harga hanya berlaku untuk
          penawaran berikutnya; penawaran lama tetap memakai harga saat dibuat.
        </p>
      </header>

      <PricingForm initial={{ SIMPLE: rules.SIMPLE ?? 0, MEDIUM: rules.MEDIUM ?? 0, COMPLEX: rules.COMPLEX ?? 0 }} />
    </div>
  );
}
