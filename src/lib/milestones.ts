import type { TaskType } from "@prisma/client";

import { TASK_TYPE_LABEL } from "@/lib/labels";

export interface MilestoneDraft {
  name: string;
  taskIds: string[];
}

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Cocokkan saran milestone AI (yang menyebut task lewat NAMA) ke id task sungguhan.
 * Cocok persis dulu, lalu saling-mengandung. Satu task hanya boleh masuk satu milestone;
 * nama yang tak dikenali dibuang (AI tidak boleh menambah task lewat milestone).
 */
export function matchSuggestions(
  suggestions: { name: string; tasks: string[] }[],
  tasks: { id: string; name: string }[],
): MilestoneDraft[] {
  const taken = new Set<string>();

  const find = (wanted: string) => {
    const target = norm(wanted);
    const free = tasks.filter((task) => !taken.has(task.id));
    return (
      free.find((task) => norm(task.name) === target) ??
      free.find((task) => target.length > 3 && (norm(task.name).includes(target) || target.includes(norm(task.name))))
    );
  };

  return suggestions
    .map(({ name, tasks: names }) => {
      const taskIds: string[] = [];
      for (const wanted of names) {
        const match = find(wanted);
        if (match) {
          taken.add(match.id);
          taskIds.push(match.id);
        }
      }
      return { name: name.trim(), taskIds };
    })
    .filter((draft) => draft.name && draft.taskIds.length > 0);
}

/** Urutan fase pengerjaan yang masuk akal: fondasi dulu, perbaikan dan perawatan belakangan. */
const TYPE_ORDER: TaskType[] = [
  "INVESTIGATION",
  "INFRASTRUCTURE",
  "NEW_FEATURE",
  "INTEGRATION",
  "ENHANCEMENT",
  "CHANGE_REQUEST",
  "BUG",
  "MAINTENANCE",
];

/** Fallback tanpa AI: kelompokkan task per tipe pekerjaan sesuai urutan fase. */
export function groupTasksIntoMilestones(tasks: { id: string; type: TaskType }[]): MilestoneDraft[] {
  const drafts: MilestoneDraft[] = [];

  for (const type of TYPE_ORDER) {
    const ids = tasks.filter((task) => task.type === type).map((task) => task.id);
    if (ids.length > 0) drafts.push({ name: TASK_TYPE_LABEL[type], taskIds: ids });
  }

  return drafts.map((draft, index) => ({ ...draft, name: `Tahap ${index + 1} — ${draft.name}` }));
}
