import { describe, expect, it } from "vitest";
import { formatIDRShort } from "@/lib/format";

describe("formatIDRShort", () => {
  it("meringkas juta dan miliar", () => {
    expect(formatIDRShort(18_600_000)).toBe("Rp18,6 jt");
    expect(formatIDRShort(20_000_000)).toBe("Rp20 jt");
    expect(formatIDRShort(1_200_000_000)).toBe("Rp1,2 M");
    expect(formatIDRShort(1_200_000)).toBe("Rp1,2 jt");
  });

  it("nilai kecil tetap utuh", () => {
    expect(formatIDRShort(0)).toBe(formatIDRShort(0));
    expect(formatIDRShort(750)).toMatch(/750/);
  });
});
