import type { Complexity } from "@prisma/client";

export interface ClarificationTask {
  name: string;
  complexity: Complexity;
  questions: { question: string }[];
}

/** Task Very Complex wajib punya minimal 1 pertanyaan klarifikasi (§2 US4). */
export function tasksMissingQuestions<T extends ClarificationTask>(tasks: T[]): T[] {
  return tasks.filter((task) => task.complexity === "VERY_COMPLEX" && task.questions.length === 0);
}

/** Teks siap tempel ke WhatsApp/email: pertanyaan dikelompokkan per tugas, tanpa tugas kosong. */
export function formatQuestionsForCopy(tasks: ClarificationTask[]): string {
  const sections = tasks
    .filter((task) => task.questions.length > 0)
    .map((task) => {
      const items = task.questions.map((q, index) => `${index + 1}. ${q.question}`);
      return [`*${task.name}*`, ...items].join("\n");
    });

  if (sections.length === 0) return "";

  return [
    "Halo, sebelum kami menyusun penawaran, mohon bantu konfirmasi beberapa hal berikut:",
    ...sections,
    "Terima kasih.",
  ].join("\n\n");
}
