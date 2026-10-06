"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ComplexityBadge } from "@/components/task-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BoardTask } from "@/lib/data/milestones";
import { sumTasks } from "@/lib/data/projects";
import { formatIDR, formatRange } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  assignTask,
  autoGroupMilestones,
  createMilestone,
  deleteMilestone,
  moveMilestone,
  renameMilestone,
  type ActionResult,
} from "./actions";

interface MilestoneView {
  id: string;
  name: string;
  tasks: BoardTask[];
}

const NONE = "__none__";

function subtotal(tasks: BoardTask[]) {
  const value = sumTasks(tasks);
  return value.customMax > 0
    ? formatRange(value.base + value.customMin, value.base + value.customMax)
    : formatIDR(value.base);
}

export function MilestoneBoard({
  projectId,
  milestones,
  unassigned,
}: {
  projectId: string;
  milestones: MilestoneView[];
  unassigned: BoardTask[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const run = (action: () => Promise<ActionResult>, onSuccess?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  const options: Record<string, string> = { [NONE]: "Belum dikelompokkan" };
  for (const m of milestones) options[m.id] = m.name;

  // Fungsi biasa (bukan komponen) agar Select tidak di-remount tiap render saat transition berjalan.
  const taskRow = (task: BoardTask, current: string) => (
    <li key={task.id} className="flex flex-wrap items-center gap-2.5 py-2 text-[13px]">
      <span className="min-w-0 flex-1 leading-snug font-medium">{task.name}</span>
      <ComplexityBadge value={task.complexity} />
      <span className="w-28 text-right text-xs tabular-nums">{subtotal([task])}</span>
      <Select
        items={options}
        value={current}
        onValueChange={(value) => value && run(() => assignTask(task.id, value === NONE ? null : value))}
      >
        <SelectTrigger className="bg-card h-8 w-44 text-xs" disabled={pending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );

  const submitNew = () => {
    if (!newName.trim()) return;
    run(() => createMilestone(projectId, newName), () => setNewName(""));
  };

  const regroup = () => {
    if (milestones.length > 0 && !window.confirm("Ganti semua pengelompokan saat ini dengan pembagian otomatis per tipe pekerjaan?")) return;
    run(() => autoGroupMilestones(projectId), () => toast.success("Milestone disusun otomatis"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-[13px]">
          {milestones.length} milestone · {unassigned.length} tugas belum dikelompokkan
        </p>
        <Button variant="outline" size="sm" onClick={regroup} disabled={pending}>
          <Sparkles className="size-3.5" />
          Susun otomatis per tipe
        </Button>
      </div>

      {milestones.length === 0 && (
        <div className="bg-card text-muted-foreground rounded-[10px] border p-8 text-center text-[13px]">
          Belum ada milestone. Tambah manual di bawah, atau susun otomatis.
        </div>
      )}

      {milestones.map((milestone, index) => (
        <section key={milestone.id} className="bg-card space-y-2 rounded-[10px] border p-4">
          <div className="flex items-center gap-2">
            {editingId === milestone.id ? (
              <>
                <Input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") run(() => renameMilestone(milestone.id, editValue), () => setEditingId(null));
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-8 flex-1 text-sm font-semibold"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Simpan nama"
                  disabled={pending}
                  onClick={() => run(() => renameMilestone(milestone.id, editValue), () => setEditingId(null))}
                >
                  <Check className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Batal" onClick={() => setEditingId(null)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <h2 className="flex-1 text-sm font-semibold">{milestone.name}</h2>
                <span className="text-sm font-semibold tabular-nums">{subtotal(milestone.tasks)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Ubah nama"
                  onClick={() => {
                    setEditingId(milestone.id);
                    setEditValue(milestone.name);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Geser ke atas" disabled={pending || index === 0} onClick={() => run(() => moveMilestone(milestone.id, "up"))}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Geser ke bawah" disabled={pending || index === milestones.length - 1} onClick={() => run(() => moveMilestone(milestone.id, "down"))}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus milestone"
                  className="text-danger"
                  disabled={pending}
                  onClick={() => run(() => deleteMilestone(milestone.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>

          {milestone.tasks.length === 0 ? (
            <p className="text-muted-foreground text-xs">Belum ada tugas. Pilih milestone ini dari daftar di bawah.</p>
          ) : (
            <ul className="divide-y">
              {milestone.tasks.map((task) => taskRow(task, milestone.id))}
            </ul>
          )}
        </section>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={newName}
          placeholder="Nama milestone baru…"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNew()}
          className="h-8 max-w-xs text-[13px]"
        />
        <Button variant="outline" size="sm" onClick={submitNew} disabled={pending || !newName.trim()}>
          <Plus className="size-3.5" />
          Tambah milestone
        </Button>
      </div>

      {unassigned.length > 0 && (
        <section className={cn("bg-card space-y-2 rounded-[10px] border border-dashed p-4")}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Belum dikelompokkan</h2>
            <span className="text-muted-foreground text-xs tabular-nums">{subtotal(unassigned)}</span>
          </div>
          <ul className="divide-y">
            {unassigned.map((task) => taskRow(task, NONE))}
          </ul>
        </section>
      )}

      <div className="flex justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="bg-card hover:bg-muted flex h-8 items-center rounded-md border px-3 text-[13px] font-medium"
        >
          Kembali ke Review Task
        </Link>
        <Link href={`/projects/${projectId}/clarification`} className={buttonVariants()}>
          Lanjut ke Klarifikasi
        </Link>
      </div>
    </div>
  );
}
