import { describe, expect, it } from "vitest";

import { evaluateQuota } from "./rate-limit";

const now = new Date("2026-10-06T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("evaluateQuota", () => {
  it("mengizinkan selama di bawah batas", () => {
    expect(evaluateQuota(Array.from({ length: 19 }, () => minutesAgo(5)), now)).toEqual({ allowed: true });
  });

  it("menolak pada batas dan memberi waktu tunggu dari slot terlama", () => {
    const stamps = [minutesAgo(50), ...Array.from({ length: 19 }, () => minutesAgo(5))];
    expect(evaluateQuota(stamps, now)).toEqual({ allowed: false, retryAfterMinutes: 10 });
  });

  it("mengabaikan analisis di luar window satu jam", () => {
    const stamps = Array.from({ length: 30 }, () => minutesAgo(61));
    expect(evaluateQuota(stamps, now)).toEqual({ allowed: true });
  });
});
