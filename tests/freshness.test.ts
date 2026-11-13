import { describe, expect, it } from "vitest";
import { daysBetween, isStale, stalenessWindow } from "../src/engine/signals.js";

describe("freshness discipline (FR-7)", () => {
  it("computes day gaps correctly", () => {
    expect(daysBetween("2026-11-01", "2026-11-08")).toBe(7);
    expect(daysBetween("2026-11-08", "2026-11-01")).toBe(0);
  });

  it("applies per-type staleness windows", () => {
    expect(stalenessWindow("hire")).toBe(180);
    expect(stalenessWindow("regulatory")).toBe(400);
    expect(stalenessWindow("publication")).toBe(720);
  });

  it("flags stale signals past their type window (demo clock = corpus meta.now)", () => {
    // hire window is 180 days; corpus now is 2026-11-08
    expect(isStale("hire", "2026-06-01")).toBe(false);
    expect(isStale("hire", "2025-11-01")).toBe(true);
  });

  it("fresh signals of any type pass", () => {
    expect(isStale("funding", "2026-10-18")).toBe(false);
    expect(isStale("trial", "2026-11-01")).toBe(false);
  });
});
