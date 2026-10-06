import { Breadcrumb } from "@/components/breadcrumb";

import { EstimationForm } from "./estimation-form";

export default function NewEstimationPage() {
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

      <EstimationForm />
    </div>
  );
}
