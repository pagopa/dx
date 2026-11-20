/** Tests for pure statistical helpers. */

import { describe, expect, it } from "vitest";

import {
  linearRegression,
  median,
  paretoShare,
  percentChange,
  percentileRank,
  safeDivide,
  share,
} from "@/lib/stats";

describe("safeDivide", () => {
  it("returns the ratio for a valid denominator", () => {
    expect(safeDivide(3, 4)).toBe(0.75);
  });

  it("returns null for a zero denominator", () => {
    expect(safeDivide(3, 0)).toBeNull();
  });
});

describe("percentChange", () => {
  it("computes a positive change", () => {
    expect(percentChange(120, 100)).toBe(20);
  });

  it("computes a negative change", () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("returns null when the previous value is zero", () => {
    expect(percentChange(5, 0)).toBeNull();
  });

  it("returns zero when both values are zero", () => {
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("linearRegression", () => {
  it("fits an exact line with rSquared 1", () => {
    const result = linearRegression([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]);

    expect(result).not.toBeNull();
    expect(result?.slope).toBeCloseTo(2);
    expect(result?.intercept).toBeCloseTo(0);
    expect(result?.rSquared).toBeCloseTo(1);
  });

  it("returns null with fewer than two points", () => {
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
    expect(linearRegression([])).toBeNull();
  });

  it("returns null when all x values are identical", () => {
    expect(
      linearRegression([
        { x: 1, y: 1 },
        { x: 1, y: 5 },
      ]),
    ).toBeNull();
  });

  it("reports a low rSquared for noisy data", () => {
    const result = linearRegression([
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 1 },
      { x: 3, y: 9 },
    ]);

    expect(result).not.toBeNull();
    expect(result?.rSquared).toBeLessThan(0.5);
  });
});

describe("paretoShare", () => {
  it("returns the share held by the top fraction", () => {
    // sorted: 100, 80, 20, 10 -> total 210, top 25% (1 item) = 100
    expect(paretoShare([10, 100, 20, 80], 0.25)).toBeCloseTo(100 / 210);
  });

  it("takes at least one value even for tiny fractions", () => {
    expect(paretoShare([5, 1], 0.01)).toBeCloseTo(5 / 6);
  });

  it("returns null when there are no positive values", () => {
    expect(paretoShare([0, 0], 0.1)).toBeNull();
    expect(paretoShare([], 0.1)).toBeNull();
  });
});

describe("share", () => {
  it("returns the share of a numerator over a total", () => {
    expect(share(25, 100)).toBe(0.25);
  });

  it("returns null when the denominator is zero", () => {
    expect(share(1, 0)).toBeNull();
  });
});

describe("median", () => {
  it("returns the middle value for an odd list", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for an even list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns null for an empty list", () => {
    expect(median([])).toBeNull();
  });
});

describe("percentileRank", () => {
  it("computes the fraction at or below a value", () => {
    expect(percentileRank(2, [1, 2, 3, 4])).toBe(0.5);
  });

  it("returns null for an empty reference set", () => {
    expect(percentileRank(1, [])).toBeNull();
  });
});
