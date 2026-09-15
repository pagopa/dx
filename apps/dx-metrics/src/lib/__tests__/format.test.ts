/** Tests for shared formatting helpers. */

import { describe, expect, it } from "vitest";

import {
  EMPTY_VALUE,
  formatFullDate,
  formatNumber,
  formatPercent,
  formatShortDate,
  formatWithUnit,
} from "@/lib/format";

describe("formatNumber", () => {
  it("formats with the requested precision", () => {
    expect(formatNumber(12.345, 1)).toBe("12.3");
    expect(formatNumber(12, 0)).toBe("12");
  });

  it("returns the placeholder for missing or invalid values", () => {
    expect(formatNumber(null)).toBe(EMPTY_VALUE);
    expect(formatNumber(undefined)).toBe(EMPTY_VALUE);
    expect(formatNumber(Number.NaN)).toBe(EMPTY_VALUE);
  });
});

describe("formatPercent", () => {
  it("appends the percent sign", () => {
    expect(formatPercent(42, 0)).toBe("42%");
  });

  it("handles missing values", () => {
    expect(formatPercent(null)).toBe(EMPTY_VALUE);
  });
});

describe("formatWithUnit", () => {
  it("joins value and unit", () => {
    expect(formatWithUnit(3, "days")).toBe("3 days");
  });

  it("omits the unit for missing values", () => {
    expect(formatWithUnit(null, "days")).toBe(EMPTY_VALUE);
  });
});

describe("formatShortDate", () => {
  it("formats a valid date without the year", () => {
    expect(formatShortDate("2026-11-10")).toContain("Nov");
  });

  it("returns the raw string for invalid dates", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatFullDate", () => {
  it("formats a valid date with the year", () => {
    expect(formatFullDate("2026-11-10")).toContain("2026");
  });
});
