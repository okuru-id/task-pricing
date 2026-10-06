import { describe, expect, it } from "vitest";

import { groupTasksIntoMilestones, matchSuggestions } from "./milestones";

const tasks = [
  { id: "1", name: "Login dengan Google" },
  { id: "2", name: "Halaman dashboard" },
  { id: "3", name: "Integrasi Midtrans" },
];

describe("matchSuggestions", () => {
  it("memetakan nama ke id, tidak peduli huruf besar/kecil", () => {
    const result = matchSuggestions([{ name: "Fondasi", tasks: ["login dengan google", "Halaman dashboard"] }], tasks);
    expect(result).toEqual([{ name: "Fondasi", taskIds: ["1", "2"] }]);
  });

  it("satu task hanya masuk satu milestone dan nama asing dibuang", () => {
    const result = matchSuggestions(
      [
        { name: "A", tasks: ["Integrasi Midtrans", "Fitur karangan"] },
        { name: "B", tasks: ["Integrasi Midtrans"] },
      ],
      tasks,
    );
    expect(result).toEqual([{ name: "A", taskIds: ["3"] }]);
  });

  it("cocok sebagian saat nama AI sedikit berbeda", () => {
    const result = matchSuggestions([{ name: "A", tasks: ["Login dengan Google OAuth"] }], tasks);
    expect(result[0].taskIds).toEqual(["1"]);
  });
});

describe("groupTasksIntoMilestones", () => {
  it("mengurutkan fase dan menomori tahap", () => {
    const result = groupTasksIntoMilestones([
      { id: "a", type: "BUG" },
      { id: "b", type: "NEW_FEATURE" },
      { id: "c", type: "NEW_FEATURE" },
    ]);
    expect(result).toEqual([
      { name: "Tahap 1 — New Feature", taskIds: ["b", "c"] },
      { name: "Tahap 2 — Bug", taskIds: ["a"] },
    ]);
  });
});
