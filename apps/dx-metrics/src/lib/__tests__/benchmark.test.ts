/** Tests for cross-repository benchmark aggregation. */

import { describe, expect, it } from "vitest";

import { buildBenchmarkMetric, classifyPercentile } from "@/lib/benchmark";

describe("buildBenchmarkMetric", () => {
  it("computes the median and percentile ranks", () => {
    const metric = buildBenchmarkMetric({
      category: "delivery",
      key: "leadTime",
      label: "Avg lead time",
      lowerIsBetter: true,
      rows: [
        { repository: "a", value: 1 },
        { repository: "b", value: 2 },
        { repository: "c", value: 3 },
        { repository: "d", value: null },
      ],
      unit: "days",
    });

    expect(metric.median).toBe(2);
    expect(
      metric.entries.find((entry) => entry.repository === "a")?.percentileRank,
    ).toBeCloseTo(1 / 3);
    expect(
      metric.entries.find((entry) => entry.repository === "d")?.percentileRank,
    ).toBeNull();
  });

  it("returns a null median when no values are present", () => {
    const metric = buildBenchmarkMetric({
      category: "delivery",
      key: "x",
      label: "X",
      lowerIsBetter: false,
      rows: [{ repository: "a", value: null }],
    });

    expect(metric.median).toBeNull();
  });
});

describe("classifyPercentile", () => {
  it("marks the lower end as best when lower is better", () => {
    expect(classifyPercentile(0.1, true)).toBe("best");
    expect(classifyPercentile(0.9, true)).toBe("needs-attention");
  });

  it("marks the upper end as best when higher is better", () => {
    expect(classifyPercentile(0.9, false)).toBe("best");
    expect(classifyPercentile(0.1, false)).toBe("needs-attention");
  });

  it("returns unknown without a rank", () => {
    expect(classifyPercentile(null, true)).toBe("unknown");
  });
});
