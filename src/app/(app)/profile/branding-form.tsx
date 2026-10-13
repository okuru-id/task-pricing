"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveBranding } from "./actions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function BrandingForm({
  branding,
}: {
  branding: {
    companyName: string | null;
    address: string | null;
    contact: string | null;
    bankInfo: string | null;
    terms: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [brand, setBrand] = useState({
    companyName: branding.companyName ?? "",
    address: branding.address ?? "",
    contact: branding.contact ?? "",
    bankInfo: branding.bankInfo ?? "",
    terms: branding.terms ?? "",
  });

  const save = () =>
    startTransition(async () => {
      const result = await saveBranding(brand);
      if (result.ok) {
        toast.success("Identitas disimpan");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <section className="bg-card max-w-2xl space-y-4 rounded-[10px] border p-4 lg:p-5">
      <div>
        <h2 className="text-[15px] font-semibold">Identitas perusahaan</h2>
        <p className="text-muted-foreground text-xs">
          Tampil di header, pembayaran, dan syarat pada PDF penawaran.
        </p>
      </div>

      <Field label="Nama perusahaan / freelancer">
        <Input
          value={brand.companyName}
          onChange={(e) => setBrand({ ...brand, companyName: e.target.value })}
          className="h-10 text-[13px] lg:h-9"
        />
      </Field>
      <Field label="Alamat">
        <Input
          value={brand.address}
          onChange={(e) => setBrand({ ...brand, address: e.target.value })}
          className="h-10 text-[13px] lg:h-9"
        />
      </Field>
      <Field label="Kontak">
        <Input
          value={brand.contact}
          onChange={(e) => setBrand({ ...brand, contact: e.target.value })}
          className="h-10 text-[13px] lg:h-9"
        />
      </Field>
      <Field label="Info pembayaran (bank, no. rekening)">
        <Textarea
          value={brand.bankInfo}
          onChange={(e) => setBrand({ ...brand, bankInfo: e.target.value })}
          className="min-h-16 text-[13px]"
        />
      </Field>
      <Field label="Syarat & ketentuan">
        <Textarea
          value={brand.terms}
          onChange={(e) => setBrand({ ...brand, terms: e.target.value })}
          className="min-h-24 text-[13px]"
        />
      </Field>

      <Button
        size="sm"
        className="max-lg:h-10 max-lg:w-full"
        disabled={pending}
        onClick={save}
      >
        Simpan identitas
      </Button>
    </section>
  );
}
