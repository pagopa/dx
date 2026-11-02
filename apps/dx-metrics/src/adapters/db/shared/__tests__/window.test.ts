/** Tests for the shared time-window resolver. */

import { describe, expect, it } from "vitest";

import { resolveWindow } from "@/adapters/db/shared/window";

const available = {
  availableFrom: "2025-01-15T09:30:00.000Z",
  availableTo: "2026-11-02T03:12:00.000Z",
};

describe("resolveWindow", () => {
  it("keeps the legacy trailing window when no dates are provided", () => {
    const window = resolveWindow({ ...available, days: 120 });

    expect(window.days).toBe(120);
    // The legacy upper bound stays the exact latest timestamp so old bookmarks
    // render exactly what they rendered before the custom range existed.
    expect(window.endDate).toBe(available.availableTo);
    expect(window.referenceDate).toBe(available.availableTo);
    expect(window.windowEnd).toBe("2026-11-02");
    expect(window.windowStart).toBe("2026-07-05");
    expect(window.availableFrom).toBe("2025-01-15");
    expect(window.availableTo).toBe("2026-11-02");
  });

  it("applies an explicit range and includes the whole end day", () => {
    const window = resolveWindow({
      ...available,
      days: 120,
      end: "2026-11-02",
      start: "2026-06-01",
    });

    expect(window.days).toBe(155);
    expect(window.endDate).toBe("2026-11-02 23:59:59.999");
    expect(window.windowStart).toBe("2026-06-01");
    expect(window.windowEnd).toBe("2026-11-02");
    // The freshness note still reports the latest data timestamp.
    expect(window.referenceDate).toBe(available.availableTo);
  });

  it("clamps both ends to the available data range", () => {
    const window = resolveWindow({
      ...available,
      days: 120,
      end: "2030-01-01",
      start: "2020-01-01",
    });

    expect(window.windowStart).toBe("2025-01-15");
    expect(window.windowEnd).toBe("2026-11-02");
  });

  it("collapses an inverted range to a single day", () => {
    const window = resolveWindow({
      ...available,
      days: 120,
      end: "2026-06-01",
      start: "2026-11-02",
    });

    expect(window.windowStart).toBe("2026-06-01");
    expect(window.windowEnd).toBe("2026-06-01");
    expect(window.days).toBe(1);
  });

  it("fills a missing end with the latest available date", () => {
    const window = resolveWindow({
      ...available,
      days: 120,
      start: "2026-10-01",
    });

    expect(window.windowStart).toBe("2026-10-01");
    expect(window.windowEnd).toBe("2026-11-02");
    expect(window.days).toBe(33);
  });

  it("fills a missing start from the requested length", () => {
    const window = resolveWindow({
      ...available,
      days: 30,
      end: "2026-11-02",
    });

    expect(window.windowStart).toBe("2026-10-04");
    expect(window.days).toBe(30);
  });
});
