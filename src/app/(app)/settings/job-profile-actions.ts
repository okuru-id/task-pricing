"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uniqueSlug } from "@/lib/data/job-profiles";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

export type ActionResult = { ok: true } | { ok: false; error: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

/** Satu baris tipe task: kode stabil untuk AI, label untuk manusia. */
const taskTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode tipe task tidak boleh kosong")
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/, "Kode tipe task hanya boleh huruf, angka, garis bawah, dan tanda hubung"),
  label: z.string().trim().min(1, "Label tipe task tidak boleh kosong").max(80),
});

const profileSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nama profil tidak boleh kosong").max(80),
  aiInstruction: optional(2000).optional(),
  simpleGuide: optional(500).optional(),
  mediumGuide: optional(500).optional(),
  complexGuide: optional(500).optional(),
  veryComplexGuide: optional(500).optional(),
  thirdPartyHints: optional(500).optional(),
  migrationHints: optional(500).optional(),
  /** Satu pengecualian per baris di UI. */
  exclusions: z.array(z.string().trim().min(1)).max(30),
  taskTypes: z.array(taskTypeSchema).max(40),
});

export type JobProfileInput = z.input<typeof profileSchema>;

/** Pola regex yang tidak sah ditolak di sini, bukan dibiarkan gagal diam-diam saat analisis. */
function badPattern(pattern: string | null | undefined): boolean {
  if (!pattern) return false;
  try {
    new RegExp(pattern, "i");
    return false;
  } catch {
    return true;
  }
}

export async function saveJobProfile(input: JobProfileInput): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, name, exclusions, taskTypes, ...rest } = parsed.data;

  if (badPattern(rest.thirdPartyHints)) {
    return { ok: false, error: "Kata kunci pihak ketiga bukan pola yang sah" };
  }
  if (badPattern(rest.migrationHints)) {
    return { ok: false, error: "Kata kunci migrasi bukan pola yang sah" };
  }

  const duplicateCode = taskTypes.find(
    (type, index) => taskTypes.findIndex((other) => other.code === type.code) !== index,
  );
  if (duplicateCode) return { ok: false, error: `Kode tipe task ganda: ${duplicateCode.code}` };

  // Update hanya boleh menyentuh profil milik workspace pemanggil.
  if (id) {
    const existing = await prisma.jobProfile.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!existing) return { ok: false, error: "Profil pekerjaan tidak ditemukan" };

    await prisma.$transaction(async (tx) => {
      await tx.jobProfile.update({ where: { id }, data: { name, exclusions, ...rest } });
      // Tipe task ditulis ulang: lebih sederhana dan tidak meninggalkan baris yatim.
      await tx.jobTaskType.deleteMany({ where: { jobProfileId: id } });
      if (taskTypes.length > 0) {
        await tx.jobTaskType.createMany({
          data: taskTypes.map((type, order) => ({ jobProfileId: id, code: type.code, label: type.label, order })),
        });
      }
    });

    revalidatePath("/settings");
    return { ok: true };
  }

  const slug = await uniqueSlug(workspaceId, name);
  const count = await prisma.jobProfile.count({ where: { workspaceId } });

  await prisma.jobProfile.create({
    data: {
      workspaceId,
      name,
      slug,
      // Profil pertama otomatis jadi default supaya project baru selalu punya acuan.
      isDefault: count === 0,
      exclusions,
      ...rest,
      taskTypes: {
        create: taskTypes.map((type, order) => ({ code: type.code, label: type.label, order })),
      },
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function setDefaultJobProfile(id: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const target = await prisma.jobProfile.findFirst({ where: { id, workspaceId }, select: { id: true } });
  if (!target) return { ok: false, error: "Profil pekerjaan tidak ditemukan" };

  await prisma.$transaction([
    prisma.jobProfile.updateMany({ where: { workspaceId }, data: { isDefault: false } }),
    prisma.jobProfile.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteJobProfile(id: string): Promise<ActionResult> {
  const { workspaceId } = await requireScope();

  const target = await prisma.jobProfile.findFirst({
    where: { id, workspaceId },
    select: { id: true, isDefault: true, _count: { select: { projects: true } } },
  });
  if (!target) return { ok: false, error: "Profil pekerjaan tidak ditemukan" };

  // Project yang sudah memakai profil ini akan kehilangan konteks analisisnya.
  if (target._count.projects > 0) {
    return {
      ok: false,
      error: `Profil masih dipakai ${target._count.projects} project. Pindahkan project itu dulu.`,
    };
  }
  if (target.isDefault) {
    return { ok: false, error: "Profil default tidak bisa dihapus. Jadikan profil lain default lebih dulu." };
  }

  await prisma.jobProfile.delete({ where: { id } });

  revalidatePath("/settings");
  return { ok: true };
}
