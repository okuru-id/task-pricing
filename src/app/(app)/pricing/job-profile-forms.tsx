"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
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
import type { JobProfileView } from "@/lib/data/job-profiles";
import { cn } from "@/lib/utils";

import { linkJobToPricing } from "./actions";
import { deleteJobProfile, saveJobProfile, setDefaultJobProfile } from "./job-profile-actions";

interface Draft {
  id?: string;
  name: string;
  aiInstruction: string;
  simpleGuide: string;
  mediumGuide: string;
  complexGuide: string;
  veryComplexGuide: string;
  thirdPartyHints: string;
  migrationHints: string;
  /** Satu per baris — jauh lebih enak diedit daripada daftar input terpisah. */
  exclusions: string;
  taskTypes: string;
}

/** "sesi_foto: Sesi Foto" per baris; kode dipakai AI, label dilihat manusia. */
const typeLines = (profile: JobProfileView) =>
  profile.taskTypes.map((type) => `${type.code}: ${type.label}`).join("\n");

const toDraft = (profile: JobProfileView): Draft => ({
  id: profile.id,
  name: profile.name,
  aiInstruction: profile.aiInstruction ?? "",
  simpleGuide: profile.simpleGuide ?? "",
  mediumGuide: profile.mediumGuide ?? "",
  complexGuide: profile.complexGuide ?? "",
  veryComplexGuide: profile.veryComplexGuide ?? "",
  thirdPartyHints: profile.thirdPartyHints ?? "",
  migrationHints: profile.migrationHints ?? "",
  exclusions: profile.exclusions.join("\n"),
  taskTypes: typeLines(profile),
});

const emptyDraft = (): Draft => ({
  name: "",
  aiInstruction: "",
  simpleGuide: "",
  mediumGuide: "",
  complexGuide: "",
  veryComplexGuide: "",
  thirdPartyHints: "",
  migrationHints: "",
  exclusions: "",
  taskTypes: "",
});

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Baris "kode: Label". Tanpa titik dua, teksnya dipakai sebagai label dan kode dibuat otomatis. */
function parseTaskTypes(value: string) {
  return lines(value).map((line) => {
    const split = line.indexOf(":");
    if (split === -1) {
      return {
        code: line.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "tipe",
        label: line,
      };
    }
    return {
      code: line.slice(0, split).trim(),
      label: line.slice(split + 1).trim() || line.slice(0, split).trim(),
    };
  });
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

const NO_PRICING = "__default__";

export function JobProfileForms({
  profiles,
  pricingProfiles = [],
}: {
  profiles: JobProfileView[];
  /** Tarif yang bisa dipasang ke tiap jenis pekerjaan. */
  pricingProfiles?: { id: string; name: string; isDefault: boolean }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, message: string, close = true) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        if (close) setDraft(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menyimpan");
      }
    });

  const save = () => {
    if (!draft) return;
    run(
      () =>
        saveJobProfile({
          id: draft.id,
          name: draft.name,
          aiInstruction: draft.aiInstruction,
          simpleGuide: draft.simpleGuide,
          mediumGuide: draft.mediumGuide,
          complexGuide: draft.complexGuide,
          veryComplexGuide: draft.veryComplexGuide,
          thirdPartyHints: draft.thirdPartyHints,
          migrationHints: draft.migrationHints,
          exclusions: lines(draft.exclusions),
          taskTypes: parseTaskTypes(draft.taskTypes),
        }),
      draft.id ? "Profil pekerjaan disimpan" : "Profil pekerjaan dibuat",
    );
  };

  return (
    <section className="bg-card space-y-4 rounded-[10px] border p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Profil pekerjaan</h2>
          <p className="text-muted-foreground text-xs">
            Aplikasi ini tidak hanya untuk pekerjaan IT. Tiap profesi punya istilah dan ukuran
            kompleksitasnya sendiri — dan kompleksitas itulah yang menentukan harga.
          </p>
        </div>
        {!draft && (
          <Button size="sm" className="max-lg:h-10" onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" />
            Tambah profil
          </Button>
        )}
      </div>

      {!draft && (
        <ul className="divide-y">
          {profiles.length === 0 && (
            <li className="text-muted-foreground py-4 text-[13px]">
              Belum ada profil pekerjaan.
            </li>
          )}

          {profiles.map((profile) => (
            <li key={profile.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  {profile.name}
                  {profile.isDefault && (
                    <span className="bg-primary-soft text-primary rounded-md px-1.5 py-0.5 text-[11px] font-medium">
                      default
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {profile.taskTypes.length} tipe task · {profile._count.projects} project
                </p>
              </div>

              {/* Tarif dipilih langsung di baris ini: memisahkannya ke daftar lain membuat
                  kaitan jenis pekerjaan ↔ harga tidak terlihat. */}
              {pricingProfiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Tarif</span>
                  <Select
                    items={{
                      [NO_PRICING]: "Default workspace",
                      ...Object.fromEntries(pricingProfiles.map((p) => [p.id, p.name])),
                    }}
                    value={profile.pricingProfileId ?? NO_PRICING}
                    onValueChange={(value) =>
                      run(
                        () =>
                          linkJobToPricing(profile.id, !value || value === NO_PRICING ? null : value),
                        "Tarif jenis pekerjaan diperbarui",
                        false,
                      )
                    }
                  >
                    <SelectTrigger
                      disabled={pending}
                      className="bg-card w-44 text-[13px] data-[size=default]:h-10 lg:data-[size=default]:h-9"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PRICING}>Default workspace</SelectItem>
                      {pricingProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="max-lg:h-10"
                disabled={pending}
                onClick={() => setDraft(toDraft(profile))}
              >
                Ubah
              </Button>
              {!profile.isDefault && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-lg:h-10"
                    disabled={pending}
                    onClick={() => run(() => setDefaultJobProfile(profile.id), "Profil default diubah", false)}
                  >
                    <Check className="size-4" />
                    Jadikan default
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger max-lg:h-10"
                    disabled={pending}
                    onClick={() => run(() => deleteJobProfile(profile.id), "Profil dihapus", false)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="space-y-4">
          <Field label="Nama profil" hint="Mis. Fotografi Acara, Penulisan Konten, Renovasi Interior.">
            <Input
              value={draft.name}
              placeholder="Fotografi Acara"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-10 text-[13px] lg:h-9"
            />
          </Field>

          <Field
            label="Konteks untuk AI"
            hint="Satu-dua kalimat tentang profesi ini. Mengganti kalimat bawaan yang menyebut software developer."
          >
            <Textarea
              value={draft.aiInstruction}
              placeholder="Anda menganalisis pekerjaan fotografi dan videografi acara."
              onChange={(e) => setDraft({ ...draft, aiInstruction: e.target.value })}
              className="min-h-16 text-[13px]"
            />
          </Field>

          <div className="space-y-1.5">
            <Label className="text-xs">Arti tiap tingkat kompleksitas</Label>
            <p className="text-muted-foreground text-[11px]">
              Inilah dasar harga. Kosongkan satu tingkat bila ingin memakai definisi bawaan.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["simpleGuide", "Simple", "satu sesi singkat tanpa kru tambahan."],
                  ["mediumGuide", "Medium", "setengah hari dengan satu asisten."],
                  ["complexGuide", "Complex", "multi-lokasi atau butuh kru dan perizinan."],
                  ["veryComplexGuide", "Very Complex", "produksi besar lintas hari."],
                ] as const
              ).map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <Textarea
                    value={draft[key]}
                    placeholder={placeholder}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="min-h-16 text-[13px]"
                  />
                </Field>
              ))}
            </div>
          </div>

          <Field
            label="Tipe task (satu per baris)"
            hint='Format "kode: Label", mis. "sesi_foto: Sesi Foto". Kode dipakai AI, label yang Anda lihat.'
          >
            <Textarea
              value={draft.taskTypes}
              placeholder={"sesi_foto: Sesi Foto\nediting: Editing & Retouch\ncetak: Cetak & Album"}
              onChange={(e) => setDraft({ ...draft, taskTypes: e.target.value })}
              className="min-h-24 font-mono text-[13px]"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Kata kunci ketergantungan pihak ketiga"
              hint="Dipisah tanda |. Task yang memuatnya otomatis ditandai Third Party."
            >
              <Input
                value={draft.thirdPartyHints}
                placeholder="sewa studio|izin lokasi|vendor cetak"
                onChange={(e) => setDraft({ ...draft, thirdPartyHints: e.target.value })}
                className="h-10 font-mono text-[13px] lg:h-9"
              />
            </Field>
            <Field label="Kata kunci pemindahan data" hint="Kosongkan bila tidak relevan untuk profesi ini.">
              <Input
                value={draft.migrationHints}
                placeholder="migrasi|pindah data"
                onChange={(e) => setDraft({ ...draft, migrationHints: e.target.value })}
                className="h-10 font-mono text-[13px] lg:h-9"
              />
            </Field>
          </div>

          <Field
            label="Pengecualian scope (satu per baris)"
            hint="Tampil otomatis di penawaran, mis. biaya cetak atau material."
          >
            <Textarea
              value={draft.exclusions}
              placeholder={"Biaya sewa studio dan perizinan lokasi\nCetak album fisik"}
              onChange={(e) => setDraft({ ...draft, exclusions: e.target.value })}
              className="min-h-20 text-[13px]"
            />
          </Field>

          <div className={cn("flex flex-wrap gap-2", "[&>button]:max-lg:h-10 [&>button]:max-lg:flex-1")}>
            <Button size="sm" disabled={pending} onClick={save}>
              {pending ? "Menyimpan…" : draft.id ? "Simpan profil" : "Buat profil"}
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setDraft(null)}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
