import type { ProjectStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Warna badge mengikuti pipeline di design: abu/indigo/kuning/hijau/merah. */
const STATUS_CLASS: Record<ProjectStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ANALYZED: "bg-primary-soft text-primary",
  QUOTED: "bg-warning-soft text-warning-strong",
  ACCEPTED: "bg-success-soft text-success",
  REJECTED: "bg-danger-soft text-danger",
  COMPLETED: "bg-info-soft text-info",
  ARCHIVED: "bg-muted text-text-muted",
};

export const STATUS_DOT: Record<ProjectStatus, string> = {
  DRAFT: "bg-text-muted",
  ANALYZED: "bg-primary",
  QUOTED: "bg-warning",
  ACCEPTED: "bg-success",
  REJECTED: "bg-danger",
  COMPLETED: "bg-info",
  ARCHIVED: "bg-border-strong",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
