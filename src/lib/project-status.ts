import type { ProjectStatus } from "@prisma/client";

/**
 * Alur status project (§2 Lifecycle): Draft → Analyzed → Quoted → Accepted/Rejected → Completed → Archived.
 * Draft→Analyzed dan →Quoted terjadi otomatis (analisis / pembuatan quotation); sisanya manual.
 * Keputusan klien boleh dibatalkan (kembali ke Quoted) karena salah klik itu wajar.
 */
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["ARCHIVED"],
  ANALYZED: ["ARCHIVED"],
  QUOTED: ["ACCEPTED", "REJECTED", "ARCHIVED"],
  ACCEPTED: ["COMPLETED", "QUOTED", "ARCHIVED"],
  REJECTED: ["QUOTED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

/** Status dari mana pembuatan quotation baru boleh memindahkan project ke Quoted. */
export const QUOTABLE_FROM: ProjectStatus[] = ["DRAFT", "ANALYZED", "QUOTED", "REJECTED"];

export function nextStatuses(from: ProjectStatus): ProjectStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Status yang hanya masuk akal jika project punya quotation aktif. */
const NEEDS_QUOTATION: ProjectStatus[] = ["QUOTED", "ACCEPTED", "REJECTED", "COMPLETED"];

/**
 * Status tujuan saat project dipulihkan dari arsip: kembali ke status sebelum diarsipkan (`archivedFrom`).
 * Jika datanya sudah berubah sejak itu (quotation dihapus, task hilang) atau `archivedFrom` tidak diketahui
 * (diarsipkan sebelum kolomnya ada), turunkan ke status terdekat yang konsisten dengan isi project.
 */
export function restoreTarget(
  archivedFrom: ProjectStatus | null,
  has: { quotation: boolean; tasks: boolean },
): ProjectStatus {
  let target: ProjectStatus = archivedFrom && archivedFrom !== "ARCHIVED" ? archivedFrom : has.quotation ? "QUOTED" : "ANALYZED";

  if (NEEDS_QUOTATION.includes(target) && !has.quotation) target = "ANALYZED";
  if (target === "ANALYZED" && !has.tasks) target = "DRAFT";

  return target;
}
