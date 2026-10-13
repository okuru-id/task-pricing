"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const price = z.number().int("Harga harus bilangan bulat").positive("Harga harus lebih dari 0");

const schema = z.object({
  /** Kosong = buat profil harga baru. */
  profileId: z.string().optional(),
  name: z.string().trim().min(1, "Nama profil harga tidak boleh kosong").max(80),
  SIMPLE: price,
  MEDIUM: price,
  COMPLEX: price,
});

export type PricingInput = z.input<typeof schema>;

/**
 * Menyimpan harga sebagai versi rule BARU (bukan menimpa) — quotation lama tetap menunjuk
 * versi yang dipakainya lewat snapshot (§2 Pricing Profiles). Satu workspace boleh punya
 * banyak profil: tarif tiap jenis pekerjaan, atau tarif khusus klien tertentu.
 */
export async function savePricing(input: PricingInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { profileId, name, SIMPLE, MEDIUM, COMPLEX } = parsed.data;

  if (!(SIMPLE <= MEDIUM && MEDIUM <= COMPLEX)) {
    return { ok: false, error: "Harga harus naik: Simple ≤ Medium ≤ Complex" };
  }

  let targetId = profileId;

  if (targetId) {
    const owned = await prisma.pricingProfile.findFirst({
      where: { id: targetId, workspaceId },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "Profil harga tidak ditemukan" };
    await prisma.pricingProfile.update({ where: { id: targetId }, data: { name } });
  } else {
    const count = await prisma.pricingProfile.count({ where: { workspaceId } });
    const created = await prisma.pricingProfile.create({
      // Profil pertama jadi default supaya project tanpa pilihan tetap punya tarif.
      data: { workspaceId, name, isDefault: count === 0 },
      select: { id: true },
    });
    targetId = created.id;
  }

  const latest = await prisma.pricingRule.findFirst({
    where: { pricingProfileId: targetId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  await prisma.pricingRule.createMany({
    data: ([
      ["SIMPLE", SIMPLE],
      ["MEDIUM", MEDIUM],
      ["COMPLEX", COMPLEX],
    ] as const).map(([complexity, value]) => ({
      pricingProfileId: targetId!,
      complexity,
      price: value,
      version,
    })),
  });

  revalidatePath("/pricing");
  return { ok: true };
}

export async function setDefaultPricingProfile(id: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const target = await prisma.pricingProfile.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!target) return { ok: false, error: "Profil harga tidak ditemukan" };

  await prisma.$transaction([
    prisma.pricingProfile.updateMany({ where: { workspaceId }, data: { isDefault: false } }),
    prisma.pricingProfile.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/pricing");
  return { ok: true };
}

export async function deletePricingProfile(id: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const target = await prisma.pricingProfile.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      isDefault: true,
      _count: { select: { projects: true, snapshots: true } },
      jobProfile: { select: { name: true } },
    },
  });
  if (!target) return { ok: false, error: "Profil harga tidak ditemukan" };

  if (target.isDefault) {
    return { ok: false, error: "Profil default tidak bisa dihapus. Jadikan profil lain default lebih dulu." };
  }
  if (target._count.projects > 0) {
    return { ok: false, error: `Profil masih dipakai ${target._count.projects} project.` };
  }
  // Penawaran yang sudah dibuat menunjuk profil ini untuk menjelaskan asal harganya.
  if (target._count.snapshots > 0) {
    return { ok: false, error: "Profil sudah dipakai pada penawaran yang tersimpan, jadi tidak bisa dihapus." };
  }
  if (target.jobProfile) {
    return { ok: false, error: `Profil masih dipakai jenis pekerjaan "${target.jobProfile.name}".` };
  }

  await prisma.pricingProfile.delete({ where: { id } });

  revalidatePath("/pricing");
  return { ok: true };
}

/** Kaitkan jenis pekerjaan ke tarifnya — inti dari "harga sesuai jenis pekerjaan". */
export async function linkJobToPricing(jobProfileId: string, pricingProfileId: string | null): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const job = await prisma.jobProfile.findFirst({
    where: { id: jobProfileId, workspaceId },
    select: { id: true },
  });
  if (!job) return { ok: false, error: "Profil pekerjaan tidak ditemukan" };

  if (pricingProfileId) {
    const owned = await prisma.pricingProfile.findFirst({
      where: { id: pricingProfileId, workspaceId },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "Profil harga tidak ditemukan" };

    // pricingProfileId unik di JobProfile: lepaskan dulu dari pemilik lama.
    await prisma.jobProfile.updateMany({
      where: { workspaceId, pricingProfileId, NOT: { id: jobProfileId } },
      data: { pricingProfileId: null },
    });
  }

  await prisma.jobProfile.update({ where: { id: jobProfileId }, data: { pricingProfileId } });

  revalidatePath("/pricing");
  return { ok: true };
}
