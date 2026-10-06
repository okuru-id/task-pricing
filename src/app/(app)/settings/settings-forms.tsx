"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { saveAiSettings, saveBranding, type ActionResult } from "./actions";

const PROVIDERS = { openai: "OpenAI / OpenAI-compatible", ollama: "Ollama (lokal)" };

function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>, message: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return { pending, run };
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bg-card max-w-2xl space-y-4 rounded-[10px] border p-5">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function SettingsForms({
  ai,
  branding,
}: {
  ai: { provider: string; model: string; temperature: number; systemPrompt: string | null };
  branding: {
    companyName: string | null;
    address: string | null;
    contact: string | null;
    bankInfo: string | null;
    terms: string | null;
  };
}) {
  const { pending, run } = useSave();

  const [provider, setProvider] = useState(ai.provider === "ollama" ? "ollama" : "openai");
  const [model, setModel] = useState(ai.model);
  const [temperature, setTemperature] = useState(String(ai.temperature));
  const [systemPrompt, setSystemPrompt] = useState(ai.systemPrompt ?? "");

  const [brand, setBrand] = useState({
    companyName: branding.companyName ?? "",
    address: branding.address ?? "",
    contact: branding.contact ?? "",
    bankInfo: branding.bankInfo ?? "",
    terms: branding.terms ?? "",
  });

  return (
    <>
      <Section
        title="Provider AI"
        hint="API key tetap dibaca dari environment server (OPENAI_API_KEY), tidak disimpan di sini."
      >
        <Field label="Provider">
          <Select items={PROVIDERS} value={provider} onValueChange={(v) => v && setProvider(v)}>
            <SelectTrigger className="bg-card h-9 w-full text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Model">
            <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-9 text-[13px]" />
          </Field>
          <Field label="Temperature (0–2)">
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="h-9 text-[13px]"
            />
          </Field>
        </div>
        <Field label="Instruksi global (opsional)">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-24 text-[13px]"
          />
        </Field>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => saveAiSettings({ provider: provider as "openai" | "ollama", model, temperature: Number(temperature), systemPrompt }),
              "Pengaturan AI disimpan",
            )
          }
        >
          Simpan pengaturan AI
        </Button>
      </Section>

      <Section title="Identitas perusahaan" hint="Tampil di header, pembayaran, dan syarat pada PDF penawaran.">
        <Field label="Nama perusahaan / freelancer">
          <Input value={brand.companyName} onChange={(e) => setBrand({ ...brand, companyName: e.target.value })} className="h-9 text-[13px]" />
        </Field>
        <Field label="Alamat">
          <Input value={brand.address} onChange={(e) => setBrand({ ...brand, address: e.target.value })} className="h-9 text-[13px]" />
        </Field>
        <Field label="Kontak">
          <Input value={brand.contact} onChange={(e) => setBrand({ ...brand, contact: e.target.value })} className="h-9 text-[13px]" />
        </Field>
        <Field label="Info pembayaran (bank, no. rekening)">
          <Textarea value={brand.bankInfo} onChange={(e) => setBrand({ ...brand, bankInfo: e.target.value })} className="min-h-16 text-[13px]" />
        </Field>
        <Field label="Syarat & ketentuan">
          <Textarea value={brand.terms} onChange={(e) => setBrand({ ...brand, terms: e.target.value })} className="min-h-24 text-[13px]" />
        </Field>
        <Button size="sm" disabled={pending} onClick={() => run(() => saveBranding(brand), "Identitas disimpan")}>
          Simpan identitas
        </Button>
      </Section>
    </>
  );
}
