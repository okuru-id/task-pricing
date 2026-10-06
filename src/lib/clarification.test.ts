import { describe, expect, it } from "vitest";

import { formatQuestionsForCopy, tasksMissingQuestions } from "./clarification";

const task = (name: string, complexity: "SIMPLE" | "VERY_COMPLEX", questions: string[]) => ({
  name,
  complexity,
  questions: questions.map((question) => ({ question })),
});

describe("tasksMissingQuestions", () => {
  it("hanya menandai Very Complex tanpa pertanyaan", () => {
    const tasks = [
      task("A", "VERY_COMPLEX", []),
      task("B", "VERY_COMPLEX", ["Apa?"]),
      task("C", "SIMPLE", []),
    ];
    expect(tasksMissingQuestions(tasks).map((t) => t.name)).toEqual(["A"]);
  });
});

describe("formatQuestionsForCopy", () => {
  it("mengelompokkan per tugas dan melewati tugas tanpa pertanyaan", () => {
    const text = formatQuestionsForCopy([
      task("Login Google", "SIMPLE", ["Akun apa?", "Perlu SSO?"]),
      task("Kosong", "SIMPLE", []),
    ]);
    expect(text).toContain("*Login Google*\n1. Akun apa?\n2. Perlu SSO?");
    expect(text).not.toContain("Kosong");
  });

  it("mengembalikan string kosong jika tidak ada pertanyaan", () => {
    expect(formatQuestionsForCopy([task("A", "SIMPLE", [])])).toBe("");
  });
});
