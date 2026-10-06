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
