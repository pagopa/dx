/** Tests for shared formatting helpers. */

import { describe, expect, it } from "vitest";

import {
  EMPTY_VALUE,
  formatDecimal,
  formatFullDate,
  formatInteger,
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

describe("formatInteger", () => {
  it("adds thousands separators", () => {
    expect(formatInteger(1234)).toBe("1,234");
    expect(formatInteger(1234567)).toBe("1,234,567");
  });

  it("rounds away meaningless decimals", () => {
    expect(formatInteger(12.6)).toBe("13");
  });

  it("returns the placeholder for missing or invalid values", () => {
    expect(formatInteger(null)).toBe(EMPTY_VALUE);
    expect(formatInteger(undefined)).toBe(EMPTY_VALUE);
    expect(formatInteger(Number.NaN)).toBe(EMPTY_VALUE);
  });
});

describe("formatDecimal", () => {
  it("keeps up to two decimals without forcing trailing zeros", () => {
    expect(formatDecimal(3.49)).toBe("3.49");
    expect(formatDecimal(3)).toBe("3");
    expect(formatDecimal(1234.5)).toBe("1,234.5");
  });

  it("returns the placeholder for missing or invalid values", () => {
    expect(formatDecimal(null)).toBe(EMPTY_VALUE);
    expect(formatDecimal(undefined)).toBe(EMPTY_VALUE);
    expect(formatDecimal(Number.NaN)).toBe(EMPTY_VALUE);
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

  it("keeps the calendar day of a date-only string in any timezone", () => {
    expect(formatShortDate("2026-11-10")).toContain("10");
    expect(formatFullDate("2026-11-10")).toContain("10");
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

describe("date locale", () => {
  it("renders the short date in the requested locale", () => {
    expect(formatShortDate("2026-11-10", "en-GB")).toContain("Nov");
    expect(formatShortDate("2026-11-10", "it-IT").toLowerCase()).toContain(
      "nov",
    );
  });

  it("keeps the year in the full date regardless of locale", () => {
    expect(formatFullDate("2026-11-10", "it-IT")).toContain("2026");
  });
});
