"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PricingProfileView } from "@/lib/data/pricing";
import { formatDate, formatIDR } from "@/lib/format";

import { deletePricingProfile, savePricing, setDefaultPricingProfile } from "./actions";

interface Draft {
  profileId?: string;
  name: string;
  SIMPLE: string;
  MEDIUM: string;
  COMPLEX: string;
}

const toDraft = (profile: PricingProfileView): Draft => ({
  profileId: profile.id,
  name: profile.name,
  SIMPLE: String(profile.rules.SIMPLE ?? 0),
  MEDIUM: String(profile.rules.MEDIUM ?? 0),
  COMPLEX: String(profile.rules.COMPLEX ?? 0),
});

const emptyDraft = (): Draft => ({ name: "", SIMPLE: "100000", MEDIUM: "200000", COMPLEX: "300000" });

const ROWS = [
  { key: "SIMPLE", label: "Simple" },
  { key: "MEDIUM", label: "Medium" },
  { key: "COMPLEX", label: "Complex" },
] as const;

export function PricingForm({ profiles }: { profiles: PricingProfileView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  // Profil yang sedang diubah — dipakai untuk menampilkan riwayat versinya.
  const editing = draft?.profileId ? profiles.find((p) => p.id === draft.profileId) : undefined;

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
        savePricing({
          profileId: draft.profileId,
          name: draft.name,
          SIMPLE: Number(draft.SIMPLE),
          MEDIUM: Number(draft.MEDIUM),
          COMPLEX: Number(draft.COMPLEX),
        }),
      draft.profileId ? "Harga disimpan sebagai versi baru" : "Profil harga dibuat",
    );
  };

  return (
    <section className="bg-card space-y-4 rounded-[10px] border p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Profil harga</h2>
          <p className="text-muted-foreground text-xs">
            Tarif per tingkat kompleksitas. Boleh lebih dari satu — mis. tarif berbeda untuk tiap
            jenis pekerjaan, atau untuk klien korporat.
          </p>
        </div>
        {!draft && (
          <Button size="sm" className="max-lg:h-10" onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" />
            Tambah profil harga
          </Button>
        )}
      </div>

      {!draft && (
        <ul className="divide-y">
          {profiles.length === 0 && (
            <li className="text-muted-foreground py-4 text-[13px]">Belum ada profil harga.</li>
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
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatIDR(profile.rules.SIMPLE ?? 0)} · {formatIDR(profile.rules.MEDIUM ?? 0)} ·{" "}
                  {formatIDR(profile.rules.COMPLEX ?? 0)} · {profile.projectCount} project
                </p>
              </div>

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
                    onClick={() => run(() => setDefaultPricingProfile(profile.id), "Profil default diubah", false)}
                  >
                    <Check className="size-4" />
                    Jadikan default
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger max-lg:h-10"
                    disabled={pending}
                    onClick={() => run(() => deletePricingProfile(profile.id), "Profil harga dihapus", false)}
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
          <div className="space-y-1.5">
            <Label className="text-xs">Nama profil harga</Label>
            <Input
              value={draft.name}
              placeholder="Tarif Fotografi"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-10 text-[13px] lg:h-9"
            />
          </div>

          {ROWS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label} (Rp)</Label>
              <Input
                type="number"
                min={1}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className="h-10 text-[13px] lg:h-9"
              />
            </div>
          ))}

          <p className="text-muted-foreground text-xs">
            Very Complex tidak punya harga tetap — rentang diisi per tugas saat review.
            Menyimpan membuat versi baru; penawaran lama tetap memakai versi saat dibuat.
          </p>

          {/* Riwayat ditampilkan di dalam editor profilnya, bukan sebagai daftar terpisah
              yang tidak jelas milik profil mana. */}
          {editing && editing.history.length > 0 && (
            <details className="bg-muted/40 rounded-lg px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium">
                Riwayat versi ({editing.history.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {editing.history.map(({ version, changedAt, rules }, index) => (
                  <li key={version} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-semibold">
                      Versi {version}
                      {index === 0 && <span className="text-primary ml-1">· aktif</span>}
                    </span>
                    <span className="text-muted-foreground">{formatDate(changedAt)}</span>
                    <span className="text-muted-foreground w-full tabular-nums">
                      {formatIDR(rules.SIMPLE ?? 0)} · {formatIDR(rules.MEDIUM ?? 0)} ·{" "}
                      {formatIDR(rules.COMPLEX ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap gap-2 [&>button]:max-lg:h-10 [&>button]:max-lg:flex-1">
            <Button size="sm" disabled={pending} onClick={save}>
              {pending ? "Menyimpan…" : draft.profileId ? "Simpan harga" : "Buat profil harga"}
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
