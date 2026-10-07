import { describe, expect, it } from "vitest";

import { canTransition, nextStatuses, restoreTarget } from "./project-status";

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

describe("restoreTarget", () => {
  const full = { quotation: true, tasks: true };

  it("kembali ke status sebelum diarsipkan", () => {
    expect(restoreTarget("ACCEPTED", full)).toBe("ACCEPTED");
    expect(restoreTarget("COMPLETED", full)).toBe("COMPLETED");
    expect(restoreTarget("DRAFT", { quotation: false, tasks: false })).toBe("DRAFT");
  });

  it("menurunkan status yang tidak lagi konsisten dengan isi project", () => {
    // Quotation sudah dihapus selama diarsipkan → tidak boleh kembali Accepted/Quoted.
    expect(restoreTarget("ACCEPTED", { quotation: false, tasks: true })).toBe("ANALYZED");
    expect(restoreTarget("QUOTED", { quotation: false, tasks: false })).toBe("DRAFT");
    expect(restoreTarget("ANALYZED", { quotation: false, tasks: false })).toBe("DRAFT");
  });

  it("menebak dari isi project jika status asal tidak diketahui (legacy)", () => {
    expect(restoreTarget(null, full)).toBe("QUOTED");
    expect(restoreTarget(null, { quotation: false, tasks: true })).toBe("ANALYZED");
    expect(restoreTarget(null, { quotation: false, tasks: false })).toBe("DRAFT");
  });

  it("tidak pernah mengembalikan ARCHIVED", () => {
    expect(restoreTarget("ARCHIVED", full)).toBe("QUOTED");
  });
});
