import type { Complexity, ProjectStatus, TaskFlag } from "@prisma/client";

export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  SIMPLE: "Simple",
  MEDIUM: "Medium",
  COMPLEX: "Complex",
  VERY_COMPLEX: "Very Complex",
};

/**
 * Label tipe task kini datang dari JobTaskType profil pekerjaan. Peta ini hanya cadangan
 * untuk kode warisan enum lama agar project software yang sudah ada tetap terbaca rapi.
 */
const LEGACY_TASK_TYPE_LABEL: Record<string, string> = {
  BUG: "Bug",
  ENHANCEMENT: "Enhancement",
  NEW_FEATURE: "New Feature",
  INTEGRATION: "Integration",
  INFRASTRUCTURE: "Infrastructure",
  INVESTIGATION: "Investigation",
  MAINTENANCE: "Maintenance",
  CHANGE_REQUEST: "Change Request",
};

/** Peta kode → label dari profil pekerjaan; dipakai halaman yang menampilkan tipe task. */
export type TaskTypeLabels = Record<string, string>;

/**
 * Label yang dilihat user untuk satu kode tipe task. Urutan: label profil, lalu peta warisan,
 * lalu kode itu sendiri dirapikan — supaya tipe yang baru dibuat user tidak pernah tampil kosong.
 */
export function taskTypeLabel(code: string | null | undefined, labels?: TaskTypeLabels): string {
  if (!code) return "—";
  return (
    labels?.[code] ??
    LEGACY_TASK_TYPE_LABEL[code] ??
    code.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  ANALYZED: "Analyzed",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const FLAG_LABEL: Record<TaskFlag, string> = {
  NO_FLAG: "No Flag",
  CLARIFICATION_REQUIRED: "Perlu Klarifikasi",
  COMPLEX_REVIEW: "Complex Review",
  THIRD_PARTY_DEPENDENCY: "Third Party",
  DATABASE_REVIEW: "Database Review",
  ARCHITECTURE_REVIEW: "Architecture Review",
  DATA_MIGRATION: "Data Migration",
  CHANGE_REQUEST: "Change Request",
};

export const COMPLEXITY_ORDER: Complexity[] = ["SIMPLE", "MEDIUM", "COMPLEX", "VERY_COMPLEX"];

export const FLAGS = (Object.keys(FLAG_LABEL) as TaskFlag[]).filter((f) => f !== "NO_FLAG");
