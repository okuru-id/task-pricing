"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { AI_PROVIDERS, OLLAMA_DEFAULT_BASE_URL, type AiProvider } from "@/lib/ai/config";
import type { AiConfigView } from "@/lib/ai/provider";

import { saveAiSettings, saveBranding, testAiConnection, type ActionResult } from "./actions";

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
  aiProblem,
  allowPrivate,
  branding,
}: {
  ai: AiConfigView | null;
  aiProblem: string | null;
  /** Server mengizinkan endpoint localhost/jaringan privat (self-host). */
  allowPrivate: boolean;
  branding: {
    companyName: string | null;
    address: string | null;
    contact: string | null;
    bankInfo: string | null;
    terms: string | null;
  };
}) {
  const { pending, run } = useSave();

  const [provider, setProvider] = useState<AiProvider>(ai?.provider ?? "openai");
  const [model, setModel] = useState(ai?.model ?? "");
  const [temperature, setTemperature] = useState(String(ai?.temperature ?? 0.2));
  const [systemPrompt, setSystemPrompt] = useState(ai?.systemPrompt ?? "");
  const [baseUrl, setBaseUrl] = useState(ai?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);

  const isOllama = provider === "ollama";

  const [brand, setBrand] = useState({
    companyName: branding.companyName ?? "",
    address: branding.address ?? "",
    contact: branding.contact ?? "",
    bankInfo: branding.bankInfo ?? "",
    terms: branding.terms ?? "",
  });

  const test = async () => {
    const id = toast.loading("Menguji koneksi ke model…");
    const result = await testAiConnection().catch(() => ({ ok: false as const, error: "Pengujian gagal" }));
    if (result.ok) toast.success("Koneksi berhasil", { id });
    else toast.error(result.error, { id });
  };

  return (
    <>
      <Section
        title="Provider AI"
        hint="API key milik Anda sendiri (BYOK). Disimpan terenkripsi di database dan tidak pernah ditampilkan kembali; biaya pemakaian ditagih langsung oleh provider Anda."
      >
        {aiProblem && (
          <p className="bg-warning-soft text-warning-strong rounded-md px-3 py-2 text-xs font-medium">
            {aiProblem} Analisis AI belum bisa dijalankan sampai ini dilengkapi.
          </p>
        )}

        <Field label="Provider">
          <Select
            items={AI_PROVIDERS}
            value={provider}
            onValueChange={(v) => {
              if (!v) return;
              setProvider(v as AiProvider);
              // Ollama butuh Base URL lokal; isi contohnya agar tidak ada tebakan tersembunyi di server.
              if (v === "ollama" && !baseUrl && allowPrivate) setBaseUrl(OLLAMA_DEFAULT_BASE_URL);
            }}
          >
            <SelectTrigger className="bg-card h-9 w-full text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AI_PROVIDERS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {!allowPrivate && (
          <p className="text-muted-foreground text-xs">
            Server ini memblokir endpoint localhost/jaringan privat. Ollama hanya bisa dipakai jika dapat dijangkau lewat
            alamat publik; Ollama di komputer sendiri tersedia di instalasi self-host.
          </p>
        )}

        <Field label={isOllama ? "Base URL Ollama" : "Base URL (kosongkan untuk OpenAI resmi)"}>
          <Input
            value={baseUrl}
            placeholder={isOllama ? (allowPrivate ? OLLAMA_DEFAULT_BASE_URL : "https://ollama.contoh.com/v1") : "https://api.openai.com/v1"}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="h-9 text-[13px]"
          />
        </Field>

        {!isOllama && (
          <Field label="API key">
            <div className="flex gap-2">
              <Input
                type="password"
                autoComplete="off"
                value={apiKey}
                disabled={clearKey}
                placeholder={
                  ai?.hasKey && !clearKey ? `Tersimpan (…${ai.keyHint ?? "****"}) — kosongkan untuk mempertahankan` : "sk-…"
                }
                onChange={(e) => setApiKey(e.target.value)}
                className="h-9 flex-1 text-[13px]"
              />
              {ai?.hasKey && (
                <Button
                  type="button"
                  variant={clearKey ? "default" : "outline"}
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setClearKey(!clearKey);
                    setApiKey("");
                  }}
                >
                  {clearKey ? "Batal hapus" : "Hapus key"}
                </Button>
              )}
            </div>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Model">
            <Input
              value={model}
              placeholder="mis. gpt-4o-mini atau llama3.1"
              onChange={(e) => setModel(e.target.value)}
              className="h-9 text-[13px]"
            />
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
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveAiSettings({
                    provider,
                    model,
                    temperature: Number(temperature),
                    systemPrompt,
                    baseUrl,
                    apiKey: isOllama ? "" : apiKey,
                    clearKey: !isOllama && clearKey,
                  }),
                "Pengaturan AI disimpan",
              )
            }
          >
            Simpan pengaturan AI
          </Button>
          <Button size="sm" variant="outline" disabled={pending || !ai || Boolean(aiProblem)} onClick={() => void test()}>
            Tes koneksi
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Data requirement dikirim ke provider yang Anda pilih. Untuk data yang tidak boleh keluar, pakai Ollama lokal.
        </p>
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
