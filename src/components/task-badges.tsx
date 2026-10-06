import type { Complexity, Confidence, TaskFlag } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { COMPLEXITY_LABEL, FLAG_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const COMPLEXITY_CLASS: Record<Complexity, string> = {
  SIMPLE: "bg-muted text-muted-foreground",
  MEDIUM: "bg-info-soft text-info",
  COMPLEX: "bg-warning-soft text-warning-strong",
  VERY_COMPLEX: "bg-danger-soft text-danger",
};

/** Flag yang menuntut perhatian diberi warna, sisanya netral. */
const FLAG_CLASS: Partial<Record<TaskFlag, string>> = {
  THIRD_PARTY_DEPENDENCY: "bg-warning-soft text-warning-strong",
  COMPLEX_REVIEW: "bg-danger-soft text-danger",
  CLARIFICATION_REQUIRED: "bg-primary-soft text-primary",
  DATA_MIGRATION: "bg-danger-soft text-danger",
  ARCHITECTURE_REVIEW: "bg-danger-soft text-danger",
};

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  LOW: "text-danger",
  MEDIUM: "text-warning-strong",
  HIGH: "text-success",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
};

export function ComplexityBadge({ value }: { value: Complexity }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", COMPLEXITY_CLASS[value])}>
      {COMPLEXITY_LABEL[value]}
    </Badge>
  );
}

export function FlagBadge({ value }: { value: TaskFlag }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent text-[11px]",
        FLAG_CLASS[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {FLAG_LABEL[value]}
    </Badge>
  );
}

export function ConfidenceLabel({ value }: { value: Confidence }) {
  return (
    <span className={cn("text-[13px] font-medium", CONFIDENCE_CLASS[value])}>
      {CONFIDENCE_LABEL[value]}
    </span>
  );
}
