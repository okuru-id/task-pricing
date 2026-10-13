"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CloudCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { analyze, saveDraft } from "./actions";

const AUTOSAVE_MS = 10_000;

const PLACEHOLDER = `[09.14] Bu Ratna: Selamat pagi mas, saya mau bikin website buat toko batik saya...
[09.16] Bu Ratna: Nanti admin bisa tambah/edit produk dan stok sendiri.
[09.21] Bu Ratna: Terus tolong dihubungkan ke WhatsApp buat notifikasi pesanan.`;

export interface JobProfileOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export function EstimationForm({ jobProfiles = [] }: { jobProfiles?: JobProfileOption[] }) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [requirement, setRequirement] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  // Jenis pekerjaan menentukan istilah dan ukuran kompleksitas yang dipakai AI.
  const [jobProfileId, setJobProfileId] = useState<string | null>(
    jobProfiles.find((profile) => profile.isDefault)?.id ?? jobProfiles[0]?.id ?? null,
  );

  // Autosave hanya jalan kalau ada perubahan sejak simpan terakhir.
  const dirty = useRef(false);
  const latest = useRef({ name, clientName, requirement, projectId, jobProfileId });

  useEffect(() => {
    latest.current = { name, clientName, requirement, projectId, jobProfileId };
  }, [name, clientName, requirement, projectId, jobProfileId]);

  // projectId sengaja tidak masuk deps: ia berubah tepat setelah simpan,
  // dan itu bukan perubahan isi yang perlu disimpan ulang.
  useEffect(() => {
    dirty.current = true;
  }, [name, clientName, requirement, jobProfileId]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const current = latest.current;
      if (!dirty.current || !current.requirement.trim()) return;

      dirty.current = false;
      try {
        const result = await saveDraft(current);
        setProjectId(result.projectId);
        setSavedAt(new Date());
      } catch {
        dirty.current = true; // biar dicoba lagi siklus berikutnya
      }
    }, AUTOSAVE_MS);

    return () => clearInterval(timer);
  }, []);

  const handleSaveDraft = () => {
    startTransition(async () => {
      const result = await saveDraft(latest.current);
      setProjectId(result.projectId);
      setSavedAt(new Date());
      dirty.current = false;
      toast.success("Draft tersimpan");
    });
  };

  const handleAnalyze = () => {
    if (requirement.trim().length < 50) {
      toast.error("Requirement terlalu pendek — minimal 50 karakter agar AI bisa menganalisis.");
      return;
    }
    startTransition(() => analyze(latest.current));
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[13px]">
            Nama proyek
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Website Toko Batik Sekar"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client" className="text-[13px]">
            Klien
          </Label>
          <Input
            id="client"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Sekar Nusantara"
            className="h-10"
          />
        </div>
      </div>

      {/* Satu pilihan ini menentukan istilah, ukuran kompleksitas, dan flag yang dipakai AI. */}
      {jobProfiles.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[13px]">Jenis pekerjaan</Label>
          <Select
            items={Object.fromEntries(jobProfiles.map((profile) => [profile.id, profile.name]))}
            value={jobProfileId ?? ""}
            onValueChange={(value) => setJobProfileId(value ?? null)}
          >
            <SelectTrigger className="bg-card w-full text-[13px] data-[size=default]:h-10">
              <SelectValue placeholder="Pilih jenis pekerjaan" />
            </SelectTrigger>
            <SelectContent>
              {jobProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[11px]">
            Menentukan istilah dan ukuran kompleksitas yang dipakai AI. Kelola daftarnya di
            Pengaturan AI.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="requirement" className="text-[13px]">
            Kebutuhan klien
          </Label>
          <div className="flex gap-1.5">
            <span className="bg-primary-soft text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              WhatsApp
            </span>
            <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
              Email
            </span>
            <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
              Dokumen
            </span>
          </div>
        </div>

        <Textarea
          id="requirement"
          value={requirement}
          onChange={(event) => setRequirement(event.target.value)}
          placeholder={PLACEHOLDER}
          className="bg-card min-h-[400px] resize-y text-[13px] leading-relaxed"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          {savedAt ? (
            <>
              <CloudCheck className="text-success size-4" />
              Draft tersimpan otomatis ·{" "}
              {new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(savedAt)}
            </>
          ) : (
            <>Draft belum tersimpan</>
          )}
          <span>· {requirement.length} karakter</span>
        </p>

        {/* Tombol ukuran sm hanya 28px — terlalu kecil untuk disentuh di HP. */}
        <div className="flex w-full gap-2.5 sm:w-auto [&>button]:max-lg:h-10 [&>button]:max-lg:flex-1">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={pending}>
            Simpan draft
          </Button>
          <Button size="sm" onClick={handleAnalyze} disabled={pending}>
            <Sparkles className="size-4" />
            {pending ? "Memproses…" : "Analisis dengan AI"}
          </Button>
        </div>
      </div>
    </>
  );
}
