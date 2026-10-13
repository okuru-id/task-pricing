

import { taskTypeLabel, type TaskTypeLabels } from "@/lib/labels";

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

/**
 * Urutan fase bawaan untuk profil software: fondasi dulu, perbaikan dan perawatan belakangan.
 * Profil lain memakai urutan `order` tipe task miliknya sendiri, karena "fondasi" bagi
 * fotografer adalah sesi foto, bukan infrastruktur.
 */
const LEGACY_TYPE_ORDER = [
  "INVESTIGATION",
  "INFRASTRUCTURE",
  "NEW_FEATURE",
  "INTEGRATION",
  "ENHANCEMENT",
  "CHANGE_REQUEST",
  "BUG",
  "MAINTENANCE",
];

/**
 * Fallback tanpa AI: kelompokkan task per tipe pekerjaan sesuai urutan fase.
 * `types` adalah tipe profil pekerjaan terurut; tanpa itu dipakai urutan software warisan.
 */
export function groupTasksIntoMilestones(
  tasks: { id: string; type: string }[],
  types?: { code: string; label: string }[],
): MilestoneDraft[] {
  const order = types?.length
    ? types.map((type) => type.code)
    : LEGACY_TYPE_ORDER;

  const labels: TaskTypeLabels = Object.fromEntries(
    (types ?? []).map((type) => [type.code, type.label]),
  );

  const drafts: MilestoneDraft[] = [];

  for (const type of order) {
    const ids = tasks.filter((task) => task.type === type).map((task) => task.id);
    if (ids.length > 0) drafts.push({ name: taskTypeLabel(type, labels), taskIds: ids });
  }

  // Tipe di luar daftar (mis. data lama) tetap masuk, di belakang, supaya tidak ada task hilang.
  const placed = new Set(order);
  for (const type of new Set(tasks.map((task) => task.type))) {
    if (placed.has(type)) continue;
    const ids = tasks.filter((task) => task.type === type).map((task) => task.id);
    if (ids.length > 0) drafts.push({ name: taskTypeLabel(type, labels), taskIds: ids });
  }

  return drafts.map((draft, index) => ({ ...draft, name: `Tahap ${index + 1} — ${draft.name}` }));
}
