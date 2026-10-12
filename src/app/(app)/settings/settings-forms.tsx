"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { AI_PROVIDERS, OLLAMA_DEFAULT_BASE_URL, type AiProvider } from "@/lib/ai/providers";
import type { AiConfigView } from "@/lib/ai/provider";

import { listModels, saveAiSettings, saveBranding, testAiConnection, type ActionResult } from "./actions";

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
    <section className="bg-card max-w-2xl space-y-4 rounded-[10px] border p-4 xl:max-w-none lg:p-5">
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

  // Daftar model dari provider. Kosong = kolom model tetap ketikan bebas, karena tidak
  // semua gateway menyediakan endpoint /models.
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const isOllama = provider === "ollama";

  const loadModels = async (announce = true) => {
    setLoadingModels(true);
    const result = await listModels({ baseUrl, apiKey: isOllama ? "" : apiKey });
    setLoadingModels(false);

    if (!result.ok) {
      // Galat ditampilkan di bawah kolom (tetap terlihat), bukan hanya toast yang cepat hilang.
      setModelError(result.error);
      setModels([]);
      return;
    }

    setModelError(null);
    setModels(result.models);
    if (announce) toast.success(`${result.models.length} model ditemukan`);
  };

  // Daftar dimuat otomatis saat halaman dibuka jika konfigurasi sudah tersimpan, supaya user langsung
  // melihat pilihan model dari provider tanpa harus menekan tombol dulu.
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current || !ai || aiProblem) return;
    autoLoaded.current = true;
    void loadModels(false);
    // Hanya saat mount: loadModels memakai nilai form awal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Dua kolom mulai xl: di bawah itu form sempit lebih enak dibaca daripada melebar penuh.
    <div className="grid items-start gap-5 xl:grid-cols-2">
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
              setModels([]);
              setModelError(null);
              // Ollama butuh Base URL lokal; isi contohnya agar tidak ada tebakan tersembunyi di server.
              if (v === "ollama" && !baseUrl && allowPrivate) setBaseUrl(OLLAMA_DEFAULT_BASE_URL);
            }}
          >
            <SelectTrigger className="bg-card w-full text-[13px] data-[size=default]:h-10 lg:data-[size=default]:h-9">
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
            className="h-10 text-[13px] lg:h-9"
          />
        </Field>

        {!isOllama && (
          <Field label="API key">
            {/* Di mobile tombol turun ke bawah: berdampingan menyisakan input ~200px. */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                autoComplete="off"
                value={apiKey}
                disabled={clearKey}
                placeholder={
                  ai?.hasKey && !clearKey ? `Tersimpan (…${ai.keyHint ?? "****"}) — kosongkan untuk mempertahankan` : "sk-…"
                }
                onChange={(e) => setApiKey(e.target.value)}
                /* flex-1 di arah kolom membuat basis 0 → input gepeng 26px; batasi ke baris. */
                className="h-10 w-full text-[13px] sm:flex-1 lg:h-9"
              />
              {ai?.hasKey && (
                <Button
                  type="button"
                  variant={clearKey ? "default" : "outline"}
                  size="sm"
                  className="h-10 lg:h-9"
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
            <div className="space-y-1.5">
              {models.length > 0 ? (
                // Combobox, bukan Select: satu gateway bisa mengembalikan ratusan model,
                // jadi daftar tanpa pencarian tidak terpakai.
                <Combobox
                  items={models}
                  value={model}
                  onValueChange={(value) => setModel(value ?? "")}
                >
                  <ComboboxInput
                    placeholder="Cari model…"
                    className="w-full text-[13px] [&_input]:h-10 lg:[&_input]:h-9"
                  />
                  <ComboboxContent className="max-h-72">
                    <ComboboxEmpty>Tidak ada model yang cocok.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => (
                        <ComboboxItem key={id} value={id} className="text-[13px]">
                          {id}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              ) : (
                <Input
                  value={model}
                  placeholder="mis. gpt-4o-mini atau llama3.1"
                  onChange={(e) => setModel(e.target.value)}
                  className="h-10 text-[13px] lg:h-9"
                />
              )}

              {modelError && <p className="text-danger text-xs">{modelError}</p>}

              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => void loadModels()}
                  disabled={loadingModels}
                  className="text-primary font-medium hover:underline disabled:opacity-60 max-lg:py-2.5"
                >
                  {loadingModels
                    ? "Memuat…"
                    : models.length > 0
                      ? "Muat ulang daftar"
                      : "Muat daftar dari provider"}
                </button>
                {models.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModels([])}
                    className="text-muted-foreground hover:underline max-lg:px-2 max-lg:py-2"
                  >
                    Ketik manual
                  </button>
                )}
              </div>
            </div>
          </Field>
          <Field label="Temperature (0–2)">
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="h-10 text-[13px] lg:h-9"
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
        {/* Target sentuh mobile: tombol ukuran sm hanya 28px, terlalu kecil untuk jari. */}
        <div className="flex flex-wrap gap-2 [&>button]:max-lg:h-10 [&>button]:max-lg:flex-1">
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
          <Input value={brand.companyName} onChange={(e) => setBrand({ ...brand, companyName: e.target.value })} className="h-10 text-[13px] lg:h-9" />
        </Field>
        <Field label="Alamat">
          <Input value={brand.address} onChange={(e) => setBrand({ ...brand, address: e.target.value })} className="h-10 text-[13px] lg:h-9" />
        </Field>
        <Field label="Kontak">
          <Input value={brand.contact} onChange={(e) => setBrand({ ...brand, contact: e.target.value })} className="h-10 text-[13px] lg:h-9" />
        </Field>
        <Field label="Info pembayaran (bank, no. rekening)">
          <Textarea value={brand.bankInfo} onChange={(e) => setBrand({ ...brand, bankInfo: e.target.value })} className="min-h-16 text-[13px]" />
        </Field>
        <Field label="Syarat & ketentuan">
          <Textarea value={brand.terms} onChange={(e) => setBrand({ ...brand, terms: e.target.value })} className="min-h-24 text-[13px]" />
        </Field>
        <Button
          size="sm"
          className="max-lg:h-10 max-lg:w-full"
          disabled={pending}
          onClick={() => run(() => saveBranding(brand), "Identitas disimpan")}
        >
          Simpan identitas
        </Button>
      </Section>
    </div>
  );
}
