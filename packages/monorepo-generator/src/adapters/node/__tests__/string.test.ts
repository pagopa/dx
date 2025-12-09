import { describe, expect, it } from "vitest";

import { fillWithZero } from "../string.js";

describe("fillWithZero", () => {
  it("should pad single digit string with leading zero", () => {
    const result = fillWithZero("5");
    expect(result).toBe("05");
  });

  it("should not pad string that is already 2 characters long", () => {
    const result = fillWithZero("12");
    expect(result).toBe("12");
  });

  it("should not pad string that is longer than 2 characters", () => {
    const result = fillWithZero("123");
    expect(result).toBe("123");
  });

  it("should pad empty string with two zeros", () => {
    const result = fillWithZero("");
    expect(result).toBe("00");
  });
});
