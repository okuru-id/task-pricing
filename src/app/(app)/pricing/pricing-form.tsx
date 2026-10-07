"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { savePricing, type PricingInput } from "./actions";

const ROWS: { key: keyof PricingInput; label: string }[] = [
  { key: "SIMPLE", label: "Simple" },
  { key: "MEDIUM", label: "Medium" },
  { key: "COMPLEX", label: "Complex" },
];

export function PricingForm({ initial }: { initial: PricingInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState({
    SIMPLE: String(initial.SIMPLE),
    MEDIUM: String(initial.MEDIUM),
    COMPLEX: String(initial.COMPLEX),
  });

  const save = () =>
    startTransition(async () => {
      const result = await savePricing({
        SIMPLE: Number(values.SIMPLE),
        MEDIUM: Number(values.MEDIUM),
        COMPLEX: Number(values.COMPLEX),
      });
      if (result.ok) {
        toast.success("Harga disimpan sebagai versi baru");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <section className="bg-card max-w-md space-y-4 rounded-[10px] border p-4 lg:p-5">
      {ROWS.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs">{label} (Rp)</Label>
          <Input
            type="number"
            min={1}
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            className="h-10 text-[13px] lg:h-9"
          />
        </div>
      ))}
      <p className="text-muted-foreground text-xs">
        Very Complex tidak punya harga tetap — rentang diisi per tugas saat review.
      </p>
      <Button size="sm" className="max-lg:h-10 max-lg:w-full" disabled={pending} onClick={save}>
        Simpan harga
      </Button>
    </section>
  );
}
