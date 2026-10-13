import { prisma } from "@/lib/prisma";

/**
 * Profil pekerjaan menentukan kacamata analisis: istilah profesi, arti tiap tingkat
 * kompleksitas, dan kata kunci pemicu flag. Semua query di sini ter-scope workspace (§4).
 */

const profileFields = {
  id: true,
  name: true,
  slug: true,
  isDefault: true,
  aiInstruction: true,
  simpleGuide: true,
  mediumGuide: true,
  complexGuide: true,
  veryComplexGuide: true,
  thirdPartyHints: true,
  migrationHints: true,
  exclusions: true,
  pricingProfileId: true,
} as const;

export async function listJobProfiles(workspaceId: string) {
  return prisma.jobProfile.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      ...profileFields,
      taskTypes: { orderBy: { order: "asc" }, select: { id: true, code: true, label: true, order: true } },
      _count: { select: { projects: true } },
    },
  });
}

export type JobProfileView = Awaited<ReturnType<typeof listJobProfiles>>[number];

/** Profil default workspace — dipakai saat project belum menentukan profilnya sendiri. */
export async function getDefaultJobProfile(workspaceId: string) {
  return prisma.jobProfile.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: profileFields,
  });
}

/** Daftar ringkas untuk pemilih di form estimasi. */
export async function listJobProfileOptions(workspaceId: string) {
  return prisma.jobProfile.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isDefault: true },
  });
}

/**
 * Slug dipakai menandai domain pada golden set eval, jadi harus stabil dan unik per workspace.
 * Angka ditambahkan hanya bila perlu, supaya slug tetap mudah dibaca.
 */
export async function uniqueSlug(workspaceId: string, name: string, exceptId?: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "profil";

  const taken = await prisma.jobProfile.findMany({
    where: { workspaceId, slug: { startsWith: base }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { slug: true },
  });

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
