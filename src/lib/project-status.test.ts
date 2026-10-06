import { describe, expect, it } from "vitest";

import { canTransition, nextStatuses } from "./project-status";

describe("project status flow", () => {
  it("mengikuti alur utama", () => {
    expect(canTransition("QUOTED", "ACCEPTED")).toBe(true);
    expect(canTransition("ACCEPTED", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("menolak lompatan dan status yang sama", () => {
    expect(canTransition("DRAFT", "ACCEPTED")).toBe(false);
    expect(canTransition("ANALYZED", "COMPLETED")).toBe(false);
    expect(canTransition("QUOTED", "QUOTED")).toBe(false);
  });

  it("Archived adalah status akhir", () => {
    expect(nextStatuses("ARCHIVED")).toEqual([]);
  });
});
