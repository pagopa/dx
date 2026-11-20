import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  calendarDaysBetween,
  clampCalendarDate,
  formatCalendarDate,
  isCalendarDate,
  parseCalendarDate,
  toCalendarDate,
} from "../date-range.js";

describe("parseCalendarDate", () => {
  it("parses a date to UTC midnight", () => {
    expect(parseCalendarDate("2026-11-02")).toBe(
      Date.UTC(2026, 10, 2, 0, 0, 0, 0),
    );
  });

  it("accepts a timestamp and uses its date part", () => {
    expect(toCalendarDate("2026-11-02T03:12:00.000Z")).toBe("2026-11-02");
    expect(parseCalendarDate("2026-11-02 03:12:00")).toBe(
      Date.UTC(2026, 10, 2, 0, 0, 0, 0),
    );
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseCalendarDate("02/11/2026")).toBeNull();
    expect(parseCalendarDate("2026-13-01")).toBeNull();
    expect(parseCalendarDate("2026-06-30garbage")).toBeNull();
    expect(isCalendarDate("2026-02-30")).toBe(false);
  });

  it("only accepts a bare date as a query parameter", () => {
    expect(isCalendarDate("2026-11-02")).toBe(true);
    expect(isCalendarDate("2026-06-30garbage")).toBe(false);
    expect(isCalendarDate("2026-11-02T03:12:00.000Z")).toBe(false);
  });

  it("formats UTC milliseconds back to a calendar date", () => {
    expect(formatCalendarDate(Date.UTC(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addCalendarDays", () => {
  it("shifts by whole days", () => {
    expect(addCalendarDays("2026-11-02", -1)).toBe("2026-11-01");
    expect(addCalendarDays("2026-11-02", 30)).toBe("2026-12-02");
  });

  it("crosses a DST transition without losing a day", () => {
    // Europe moves the clock forward in the night between these two dates.
    expect(addCalendarDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addCalendarDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(addCalendarDays("nope", 1)).toBe("nope");
  });
});

describe("calendarDaysBetween", () => {
  it("counts both ends", () => {
    expect(calendarDaysBetween("2026-11-02", "2026-11-02")).toBe(1);
    expect(calendarDaysBetween("2026-06-01", "2026-11-02")).toBe(155);
  });
});

describe("clampCalendarDate", () => {
  it("keeps values inside the bounds", () => {
    expect(clampCalendarDate("2026-06-01", "2026-01-01", "2026-12-31")).toBe(
      "2026-06-01",
    );
  });

  it("clamps values outside the bounds", () => {
    expect(clampCalendarDate("2025-01-01", "2026-01-01", "2026-12-31")).toBe(
      "2026-01-01",
    );
    expect(clampCalendarDate("2027-01-01", "2026-01-01", "2026-12-31")).toBe(
      "2026-12-31",
    );
  });
});
