"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Complexity, Confidence } from "@prisma/client";
import { Check, Copy, Pencil, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { ComplexityBadge, ConfidenceLabel } from "@/components/task-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatQuestionsForCopy, tasksMissingQuestions } from "@/lib/clarification";

import { addQuestion, deleteQuestion, updateQuestion, type ActionResult } from "./actions";

interface ClarificationTask {
  id: string;
  name: string;
  complexity: Complexity;
  confidence: Confidence;
  questions: { id: string; question: string }[];
}

export function ClarificationList({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: ClarificationTask[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const missing = tasksMissingQuestions(tasks);
  const total = tasks.reduce((sum, task) => sum + task.questions.length, 0);

  const run = (action: () => Promise<ActionResult>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const copyAll = async () => {
    const text = formatQuestionsForCopy(tasks);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Semua pertanyaan disalin");
    } catch {
      toast.error("Gagal menyalin — izinkan akses clipboard di browser");
    }
  };

  const startEdit = (id: string, question: string) => {
    setEditingId(id);
    setEditValue(question);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-[13px]">{total} pertanyaan pada {tasks.length} tugas</p>
        <Button variant="outline" size="sm" onClick={copyAll} disabled={total === 0}>
          <Copy className="size-3.5" />
          Copy all
        </Button>
      </div>

      {missing.length > 0 && (
        <div className="bg-warning-soft flex items-start gap-2.5 rounded-lg p-3">
          <TriangleAlert className="text-warning mt-px size-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-warning-strong text-xs font-semibold">
              Tugas Very Complex wajib punya minimal 1 pertanyaan
            </p>
            <p className="text-warning-strong text-xs">
              Lengkapi: {missing.map((task) => task.name).join(", ")}.
            </p>
          </div>
        </div>
      )}

      {tasks.map((task) => {
        const required = task.complexity === "VERY_COMPLEX";
        const newValue = newValues[task.id] ?? "";

        const submitNew = () => {
          if (!newValue.trim()) return;
          run(
            () => addQuestion(task.id, newValue),
            () => setNewValues((prev) => ({ ...prev, [task.id]: "" })),
          );
        };

        return (
          <section key={task.id} className="bg-card space-y-3 rounded-[10px] border p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-sm font-semibold">{task.name}</h2>
              <ComplexityBadge value={task.complexity} />
              <ConfidenceLabel value={task.confidence} />
              {required && (
                <span className="text-muted-foreground text-[11px]">· wajib ≥ 1 pertanyaan</span>
              )}
            </div>

            {task.questions.length === 0 && (
              <p className="text-muted-foreground text-[13px]">Belum ada pertanyaan.</p>
            )}

            <ol className="space-y-2">
              {task.questions.map((q, index) => (
                <li key={q.id} className="flex items-start gap-2.5 text-[13px]">
                  <span className="bg-primary-soft text-primary mt-1 flex size-5 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-semibold">
                    {index + 1}
                  </span>

                  {editingId === q.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            run(() => updateQuestion(q.id, editValue), () => setEditingId(null));
                          }
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 flex-1 text-[13px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Simpan"
                        disabled={pending}
                        onClick={() =>
                          run(() => updateQuestion(q.id, editValue), () => setEditingId(null))
                        }
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Batal"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 pt-0.5 leading-snug">{q.question}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit pertanyaan"
                        onClick={() => startEdit(q.id, q.question)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hapus pertanyaan"
                        className="text-danger"
                        disabled={pending}
                        onClick={() => run(() => deleteQuestion(q.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ol>

            <div className="flex items-center gap-2">
              <Input
                value={newValue}
                placeholder="Tambah pertanyaan…"
                onChange={(event) => setNewValues((prev) => ({ ...prev, [task.id]: event.target.value }))}
                onKeyDown={(event) => event.key === "Enter" && submitNew()}
                className="h-8 flex-1 text-[13px]"
              />
              <Button variant="outline" size="sm" onClick={submitNew} disabled={pending || !newValue.trim()}>
                <Plus className="size-3.5" />
                Tambah
              </Button>
            </div>
          </section>
        );
      })}

      <div className="flex justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="bg-card hover:bg-muted flex h-8 items-center rounded-md border px-3 text-[13px] font-medium"
        >
          Kembali ke Review Task
        </Link>
        {/* Langkah berikutnya (Quotation) belum dibuat. */}
        <Button disabled>Lanjut ke Penawaran</Button>
      </div>
    </div>
  );
}
