/**
 * Verifies human-readable duration, credit, and token formatting.
 */
import { describe, expect, it } from "vitest";

import { formatCredits, formatDuration, formatTokens } from "../format.js";

describe("formatDuration", () => {
  it("formats seconds, minutes, and hours", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1400)).toBe("1s");
    expect(formatDuration(61_000)).toBe("1m 1s");
    expect(formatDuration(3_661_000)).toBe("1h 1m 1s");
  });
});

describe("formatCredits", () => {
  it("keeps integers and rounds fractional credits", () => {
    expect(formatCredits(3)).toBe("3");
    expect(formatCredits(1.234)).toBe("1.23");
  });
});

describe("formatTokens", () => {
  it("prints input and output token counts", () => {
    expect(formatTokens(12, 34)).toBe("12 in / 34 out");
  });
});
