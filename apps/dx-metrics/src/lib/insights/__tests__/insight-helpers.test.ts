/** Tests for shared insight helpers. */

import { describe, expect, it } from "vitest";

import {
  confidenceFromFit,
  confidenceFromSample,
  formatSpreadRatio,
  halfSplitChange,
  mean,
  severityFromChange,
  severityFromTarget,
  severityFromTargetWithTrend,
  severityFromUpperThreshold,
  sortInsights,
} from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";

describe("confidenceFromSample", () => {
  it("marks a small known sample as low confidence", () => {
    expect(confidenceFromSample(3, 10)).toBe("low");
  });

  it("does not flag an adequate sample", () => {
    expect(confidenceFromSample(25, 10)).toBeUndefined();
  });

  it("stays silent when the sample size is unknown", () => {
    expect(confidenceFromSample(undefined)).toBeUndefined();
    expect(confidenceFromSample(null)).toBeUndefined();
  });
});

describe("confidenceFromFit", () => {
  it("marks a poorly fitted trend as low confidence", () => {
    expect(confidenceFromFit(0.05, 0.3)).toBe("low");
  });

  it("does not flag a well fitted trend", () => {
    expect(confidenceFromFit(0.8, 0.3)).toBeUndefined();
  });
});

describe("mean", () => {
  it("averages finite values", () => {
    expect(mean([1, 2, 3])).toBe(2);
  });

  it("returns null for an empty list", () => {
    expect(mean([])).toBeNull();
  });
});

describe("halfSplitChange", () => {
  it("detects an increase between halves", () => {
    const result = halfSplitChange([1, 1, 1, 3, 3, 3]);

    expect(result?.firstAverage).toBe(1);
    expect(result?.secondAverage).toBe(3);
    expect(result?.deltaPct).toBeCloseTo(200);
  });

  it("returns null for series shorter than four points", () => {
    expect(halfSplitChange([1, 2, 3])).toBeNull();
  });

  it("returns null when the baseline is zero", () => {
    expect(halfSplitChange([0, 0, 1, 1])).toBeNull();
  });
});

describe("severityFromChange", () => {
  const options = { higherIsBetter: false, significantChangePct: 10 };

  it("treats small changes as neutral", () => {
    expect(severityFromChange(5, options)).toBe("neutral");
  });

  it("treats a decrease as positive when lower is better", () => {
    expect(severityFromChange(-20, options)).toBe("positive");
  });

  it("treats an increase as warning when lower is better", () => {
    expect(severityFromChange(20, options)).toBe("warning");
  });
});

describe("severityFromTarget", () => {
  const lowerIsBetter = { higherIsBetter: false, tolerancePct: 25 };

  it("is positive when the goal is met", () => {
    expect(severityFromTarget(3, 5, lowerIsBetter)).toBe("positive");
  });

  it("is neutral within the tolerance band", () => {
    expect(severityFromTarget(6, 5, lowerIsBetter)).toBe("neutral");
  });

  it("is a warning beyond tolerance", () => {
    expect(severityFromTarget(8, 5, lowerIsBetter)).toBe("warning");
  });

  it("is critical beyond the multiplier", () => {
    expect(severityFromTarget(11, 5, lowerIsBetter)).toBe("critical");
  });

  it("handles higher-is-better targets", () => {
    const higherIsBetter = { higherIsBetter: true, tolerancePct: 25 };
    expect(severityFromTarget(70, 90, higherIsBetter)).toBe("neutral");
    expect(severityFromTarget(30, 90, higherIsBetter)).toBe("critical");
  });
});

describe("severityFromUpperThreshold", () => {
  it("is positive below the threshold", () => {
    expect(severityFromUpperThreshold(0.3, 0.4)).toBe("positive");
  });

  it("is a warning above the threshold", () => {
    expect(severityFromUpperThreshold(0.6, 0.4)).toBe("warning");
  });

  it("is critical beyond the multiplier", () => {
    expect(severityFromUpperThreshold(0.9, 0.4)).toBe("critical");
  });
});

describe("formatSpreadRatio", () => {
  it("formats a moderate ratio", () => {
    expect(formatSpreadRatio(3.4)).toBe(" (3.4x)");
  });

  it("omits extreme or non-positive ratios", () => {
    expect(formatSpreadRatio(112)).toBe("");
    expect(formatSpreadRatio(0)).toBe("");
  });
});

describe("severityFromTargetWithTrend", () => {
  const options = {
    higherIsBetter: false,
    significantChangePct: 30,
    tolerancePct: 25,
  };

  it("downgrades an in-target but worsening metric", () => {
    // lead time 4 days within a 5-day target, but up 65% vs the previous period
    expect(severityFromTargetWithTrend(4, 5, 65, options)).toBe("warning");
  });

  it("keeps an in-target and stable metric positive", () => {
    expect(severityFromTargetWithTrend(4, 5, 10, options)).toBe("positive");
  });

  it("falls back to target status without a delta", () => {
    expect(severityFromTargetWithTrend(4, 5, null, options)).toBe("positive");
    expect(severityFromTargetWithTrend(9, 5, null, options)).toBe("warning");
  });
});

describe("sortInsights", () => {
  it("orders by severity then id", () => {
    const insights: Insight[] = [
      {
        category: "quality",
        detail: "a",
        id: "b",
        severity: "positive",
        title: "B",
      },
      {
        category: "quality",
        detail: "b",
        id: "a",
        severity: "critical",
        title: "A",
      },
      {
        category: "quality",
        detail: "c",
        id: "c",
        severity: "warning",
        title: "C",
      },
    ];

    expect(sortInsights(insights).map((insight) => insight.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
});
