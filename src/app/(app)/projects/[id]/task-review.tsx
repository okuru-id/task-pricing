"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Complexity, TaskFlag, TaskType } from "@prisma/client";
import { ChevronDown, ChevronUp, Lock, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { ComplexityBadge, ConfidenceLabel, FlagBadge } from "@/components/task-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { EstimationTaskView } from "@/lib/data/estimations";
import { formatIDR, formatRange } from "@/lib/format";
import { COMPLEXITY_LABEL, COMPLEXITY_ORDER, FLAGS, FLAG_LABEL, TASK_TYPES, TASK_TYPE_LABEL } from "@/lib/labels";
import { priceTask, totalPrice, type PriceRules } from "@/lib/pricing-engine";
import { cn } from "@/lib/utils";

import { addTask, deleteTask, updateTask } from "./actions";

interface Draft {
  name: string;
  type: TaskType;
  complexity: Complexity;
  reason: string;
  flags: TaskFlag[];
  breakdown: string;
  questions: string;
  customEstimateMin: string;
  customEstimateMax: string;
}

function toDraft(task: EstimationTaskView): Draft {
  return {
    name: task.name,
    type: task.type,
    complexity: task.complexity,
    reason: task.reason ?? "",
    flags: task.flags.map((f) => f.flag),
    breakdown: task.breakdowns.map((b) => b.description).join("\n"),
    questions: task.clarificationQuestions.map((q) => q.question).join("\n"),
    customEstimateMin: task.customEstimateMin?.toString() ?? "",
    customEstimateMax: task.customEstimateMax?.toString() ?? "",
  };
}

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function TaskReview({
  projectId,
  tasks,
  rules,
}: {
  projectId: string;
  tasks: EstimationTaskView[];
  rules: PriceRules;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const counts = new Map<Complexity, number>();
    for (const task of tasks) {
      counts.set(task.complexity, (counts.get(task.complexity) ?? 0) + 1);
    }

    const total = totalPrice(
      tasks.map((task) => ({
        complexity: task.complexity,
        // Very Complex yang belum diisi range dihitung 0, bukan diberi harga karangan.
        customEstimateMin: task.customEstimateMin ?? 0,
        customEstimateMax: task.customEstimateMax ?? 0,
      })),
      rules,
    );

    const lowConfidence = tasks.filter((task) => task.confidence === "LOW").length;
    const missingRange = tasks.filter(
      (task) => task.complexity === "VERY_COMPLEX" && task.customEstimateMax == null,
    ).length;

    return { counts, total, lowConfidence, missingRange };
  }, [tasks, rules]);

  const openEditor = (task: EstimationTaskView) => {
    if (expandedId === task.id) {
      setExpandedId(null);
      setDraft(null);
      return;
    }
    setExpandedId(task.id);
    setDraft(toDraft(task));
  };

  const save = (taskId: string) => {
    if (!draft) return;

    startTransition(async () => {
      const result = await updateTask({
        taskId,
        name: draft.name,
        type: draft.type,
        complexity: draft.complexity,
        reason: draft.reason || null,
        flags: draft.flags,
        breakdown: lines(draft.breakdown),
        questions: lines(draft.questions),
        customEstimateMin: draft.customEstimateMin ? Number(draft.customEstimateMin) : null,
        customEstimateMax: draft.customEstimateMax ? Number(draft.customEstimateMax) : null,
      });

      if (result.ok) {
        toast.success("Tugas disimpan");
        setExpandedId(null);
        setDraft(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const remove = (taskId: string) => {
    startTransition(async () => {
      const result = await deleteTask(taskId);
      if (result.ok) {
        toast.success("Tugas dihapus");
        setExpandedId(null);
        setDraft(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const append = () => {
    startTransition(async () => {
      const result = await addTask(projectId);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="bg-card min-w-0 flex-1 overflow-hidden rounded-[10px] border">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="text-[11px] font-semibold">TUGAS</TableHead>
              <TableHead className="w-24 text-[11px] font-semibold">TIPE</TableHead>
              <TableHead className="w-26 text-[11px] font-semibold">KOMPLEKSITAS</TableHead>
              <TableHead className="w-42 text-[11px] font-semibold">FLAG</TableHead>
              <TableHead className="w-20 text-[11px] font-semibold">CONFIDENCE</TableHead>
              <TableHead className="w-26 text-right text-[11px] font-semibold">HARGA</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                  Belum ada tugas pada estimasi ini.
                </TableCell>
              </TableRow>
            )}

            {tasks.map((task) => {
              const expanded = expandedId === task.id;
              const needsRange =
                task.complexity === "VERY_COMPLEX" && task.customEstimateMax == null;

              return (
                <Fragment key={task.id}>
                  <TableRow
                    onClick={() => openEditor(task)}
                    className={cn(
                      "cursor-pointer align-top",
                      expanded && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    <TableCell className="text-[13px] leading-snug font-medium whitespace-normal">
                      {task.name}
                      {task.edited && (
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          · diedit
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs leading-snug whitespace-normal">
                      {TASK_TYPE_LABEL[task.type]}
                    </TableCell>
                    <TableCell>
                      <ComplexityBadge value={task.complexity} />
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {task.flags.map(({ flag }) => (
                          <FlagBadge key={flag} value={flag} />
                        ))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ConfidenceLabel value={task.confidence} />
                    </TableCell>
                    <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                      {needsRange ? (
                        <span className="text-danger text-xs">Perlu range</span>
                      ) : task.complexity === "VERY_COMPLEX" ? (
                        <span className="text-xs">
                          {formatRange(
                            task.customEstimateMin ?? 0,
                            task.customEstimateMax ?? 0,
                          )}
                        </span>
                      ) : (
                        formatIDR(priceTask({ complexity: task.complexity }, rules).price)
                      )}
                    </TableCell>
                    <TableCell>
                      {expanded ? (
                        <ChevronUp className="text-muted-foreground size-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground size-4" />
                      )}
                    </TableCell>
                  </TableRow>

                  {expanded && draft && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="bg-background p-0 whitespace-normal">
                        <div className="grid gap-7 p-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-[11px] font-semibold">
                      RINCIAN LANGKAH (AI)
                    </p>

                    {task.breakdowns.length === 0 && (
                      <p className="text-muted-foreground text-[13px]">Belum ada rincian.</p>
                    )}

                    <ol className="space-y-2">
                      {task.breakdowns.map((step, index) => (
                        <li key={step.id} className="flex gap-2.5 text-[13px]">
                          <span className="bg-primary-soft text-primary flex size-5 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-semibold">
                            {index + 1}
                          </span>
                          {step.description}
                        </li>
                      ))}
                    </ol>

                    {task.reason && (
                      <p className="text-muted-foreground text-xs italic">
                        Alasan AI: {task.reason}
                      </p>
                    )}

                    <div className="bg-card text-muted-foreground flex items-start gap-2 rounded-md border p-2.5 text-xs">
                      <Lock className="mt-px size-3.5 shrink-0" />
                      Harga ditentukan sistem dari kompleksitas, bukan oleh AI.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nama tugas</Label>
                      <Input
                        value={draft.name}
                        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        className="h-9 text-[13px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipe</Label>
                      <Select
                        items={TASK_TYPE_LABEL}
                        value={draft.type}
                        onValueChange={(value) =>
                          setDraft({ ...draft, type: value as TaskType })
                        }
                      >
                        <SelectTrigger className="bg-card h-9 w-full text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {TASK_TYPE_LABEL[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Kompleksitas</Label>
                      <ToggleGroup
                        variant="outline"
                        size="sm"
                        className="flex-wrap"
                        value={[draft.complexity]}
                        onValueChange={([value]) =>
                          value && setDraft({ ...draft, complexity: value as Complexity })
                        }
                      >
                        {COMPLEXITY_ORDER.map((value) => (
                          <ToggleGroupItem key={value} value={value} className="text-xs">
                            {COMPLEXITY_LABEL[value]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      <p className="text-muted-foreground text-xs">
                        Pilih Very Complex untuk mengisi rentang harga kustom.
                      </p>
                    </div>

                    {draft.complexity === "VERY_COMPLEX" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Harga minimum (Rp)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.customEstimateMin}
                            onChange={(event) =>
                              setDraft({ ...draft, customEstimateMin: event.target.value })
                            }
                            className="h-9 text-[13px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Harga maksimum (Rp)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.customEstimateMax}
                            onChange={(event) =>
                              setDraft({ ...draft, customEstimateMax: event.target.value })
                            }
                            className="h-9 text-[13px]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs">Flag</Label>
                      <ToggleGroup
                        multiple
                        variant="outline"
                        size="sm"
                        className="flex-wrap"
                        value={draft.flags}
                        onValueChange={(value) =>
                          setDraft({ ...draft, flags: value as TaskFlag[] })
                        }
                      >
                        {FLAGS.map((flag) => (
                          <ToggleGroupItem key={flag} value={flag} className="text-[11px]">
                            {FLAG_LABEL[flag]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Rincian langkah (satu per baris)</Label>
                      <Textarea
                        value={draft.breakdown}
                        onChange={(event) =>
                          setDraft({ ...draft, breakdown: event.target.value })
                        }
                        className="bg-card min-h-24 text-[13px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Pertanyaan klarifikasi (satu per baris)
                      </Label>
                      <Textarea
                        value={draft.questions}
                        onChange={(event) =>
                          setDraft({ ...draft, questions: event.target.value })
                        }
                        className="bg-card min-h-20 text-[13px]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger"
                        onClick={() => remove(task.id)}
                        disabled={pending}
                      >
                        Hapus
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExpandedId(null);
                          setDraft(null);
                        }}
                        disabled={pending}
                      >
                        Batal
                      </Button>
                      <Button size="sm" onClick={() => save(task.id)} disabled={pending}>
                        {pending ? "Menyimpan…" : "Simpan"}
                      </Button>
                    </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        <Button
          variant="ghost"
          onClick={append}
          disabled={pending}
          className="text-primary w-full justify-start rounded-none border-t py-6 text-[13px]"
        >
          <Plus className="size-4" />
          Tambah tugas
        </Button>
      </section>

      <Card className="h-fit w-full shrink-0 rounded-[10px] [--card-spacing:--spacing(5)] lg:w-[296px]">
        <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Ringkasan Harga</h2>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="bg-success size-1.5 rounded-full" />
            Live
          </span>
        </div>

        <ul className="space-y-2.5">
          {COMPLEXITY_ORDER.map((complexity) => {
            const count = summary.counts.get(complexity) ?? 0;
            if (count === 0) return null;

            return (
              <li key={complexity} className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">
                  {count} × {COMPLEXITY_LABEL[complexity]}
                </span>
                <span className="font-medium tabular-nums">
                  {complexity === "VERY_COMPLEX"
                    ? formatRange(summary.total.customMin, summary.total.customMax)
                    : formatIDR(priceTask({ complexity }, rules).price * count)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="bg-border h-px" />

        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Total estimasi</p>
          <p className="text-xl font-bold tabular-nums">
            {summary.total.customMax > 0
              ? formatRange(
                  summary.total.base + summary.total.customMin,
                  summary.total.base + summary.total.customMax,
                )
              : formatIDR(summary.total.base)}
          </p>
          <p className="text-muted-foreground text-xs">
            {tasks.length} tugas · belum termasuk pajak
          </p>
        </div>

        {(summary.lowConfidence > 0 || summary.missingRange > 0) && (
          <div className="bg-warning-soft flex items-start gap-2.5 rounded-lg p-3">
            <TriangleAlert className="text-warning mt-px size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-warning-strong text-xs font-semibold">
                Harga masih indikatif
              </p>
              <p className="text-warning-strong text-xs">
                {summary.missingRange > 0 &&
                  `${summary.missingRange} tugas Very Complex belum punya rentang harga. `}
                {summary.lowConfidence > 0 &&
                  `${summary.lowConfidence} tugas berconfidence rendah. `}
                Jawab klarifikasi pelanggan sebelum mengirim penawaran.
              </p>
            </div>
          </div>
        )}

        {tasks.length === 0 || summary.missingRange > 0 ? (
          <Button className="w-full" disabled>
            Lanjut ke Klarifikasi
          </Button>
        ) : (
          <Link
            href={`/projects/${projectId}/clarification`}
            className={cn(buttonVariants(), "w-full")}
          >
            Lanjut ke Klarifikasi
          </Link>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
