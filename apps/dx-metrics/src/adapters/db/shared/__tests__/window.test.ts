/** Tests for the shared time-window resolver. */

import { describe, expect, it } from "vitest";

import {
  previousWindow,
  resolveWindow,
  splitWindow,
} from "@/adapters/db/shared/window";

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
    expect(window.startDate).toBe("2026-07-05T03:12:00.000Z");
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
    expect(window.startDate).toBe("2026-06-01T00:00:00.000Z");
    expect(window.endDate).toBe("2026-11-02T23:59:59.999Z");
    expect(window.windowStart).toBe("2026-06-01");
    expect(window.windowEnd).toBe("2026-11-02");
    // The freshness note still reports the latest data timestamp.
    expect(window.referenceDate).toBe(available.availableTo);
  });

  it("derives previous and half windows from the applied bounds", () => {
    const window = resolveWindow({
      ...available,
      days: 120,
      end: "2026-06-30",
      start: "2026-06-01",
    });

    // The preceding window is anchored to the selection, not to the latest data.
    expect(previousWindow(window)).toEqual({
      endDate: "2026-06-01T00:00:00.000Z",
      startDate: "2026-05-02T00:00:00.000Z",
    });

    const split = splitWindow(window);
    expect(split.halfDays).toBe(15);
    expect(split.previous).toEqual({
      endDate: split.current.startDate,
      startDate: window.startDate,
    });
    expect(split.current.endDate).toBe(window.endDate);
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
