"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { nextStatuses } from "@/lib/project-status";

import { deleteProject, restoreProject, setProjectStatus } from "./lifecycle-actions";

const ACTION_LABEL: Partial<Record<ProjectStatus, string>> = {
  ACCEPTED: "Tandai diterima",
  REJECTED: "Tandai ditolak",
  COMPLETED: "Tandai selesai",
  QUOTED: "Batalkan keputusan",
  ARCHIVED: "Arsipkan",
};

export function ProjectActions({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (to: ProjectStatus) =>
    startTransition(async () => {
      const result = await setProjectStatus(projectId, to);
      if (result.ok) {
        toast.success("Status diperbarui");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const restore = () =>
    startTransition(async () => {
      const result = await restoreProject(projectId);
      if (result.ok) {
        toast.success("Project dipulihkan dari arsip");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const remove = () => {
    if (!window.confirm("Hapus project ini? Datanya tetap tersimpan sebagai riwayat.")) return;
    startTransition(async () => {
      // Berhasil → server redirect ke dashboard; hanya error yang kembali ke sini.
      const result = await deleteProject(projectId);
      if (result && !result.ok) toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={status} />
      {status === "ARCHIVED" && (
        <Button variant="outline" size="sm" disabled={pending} onClick={restore}>
          <ArchiveRestore className="size-3.5" />
          Pulihkan dari arsip
        </Button>
      )}
      {nextStatuses(status).map((to) => (
        <Button key={to} variant="outline" size="sm" disabled={pending} onClick={() => change(to)}>
          {ACTION_LABEL[to] ?? to}
        </Button>
      ))}
      <Button variant="ghost" size="icon-sm" aria-label="Hapus project" className="text-danger" disabled={pending} onClick={remove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
