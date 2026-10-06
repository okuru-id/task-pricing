import type { Complexity, ProjectStatus, TaskFlag, TaskType } from "@prisma/client";

export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  SIMPLE: "Simple",
  MEDIUM: "Medium",
  COMPLEX: "Complex",
  VERY_COMPLEX: "Very Complex",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  BUG: "Bug",
  ENHANCEMENT: "Enhancement",
  NEW_FEATURE: "New Feature",
  INTEGRATION: "Integration",
  INFRASTRUCTURE: "Infrastructure",
  INVESTIGATION: "Investigation",
  MAINTENANCE: "Maintenance",
  CHANGE_REQUEST: "Change Request",
};

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

export const TASK_TYPES = Object.keys(TASK_TYPE_LABEL) as TaskType[];

export const FLAGS = (Object.keys(FLAG_LABEL) as TaskFlag[]).filter((f) => f !== "NO_FLAG");
