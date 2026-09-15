/** Tests for IaC insight rules. */

import { describe, expect, it } from "vitest";

import { buildIacInsights } from "@/lib/insights/iac";

describe("buildIacInsights", () => {
  it("marks team-owned infrastructure and worse lead time / review load", () => {
    const insights = buildIacInsights({
      leadTimeMovingAvg: [
        { avgLeadTimeDays: 1 },
        { avgLeadTimeDays: 1 },
        { avgLeadTimeDays: 4 },
        { avgLeadTimeDays: 4 },
      ],
      prsByReviewer: [
        { reviewer: "alice", totalPrs: 8 },
        { reviewer: "bob", totalPrs: 2 },
      ],
      supervisedVsUnsupervised: [
        { cumulativeCount: 3, prType: "Supervised PRs" },
        { cumulativeCount: 7, prType: "Unsupervised PRs" },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "iac-supervision")?.severity,
    ).toBe("positive");
    expect(
      insights.find((insight) => insight.id === "iac-lead-time-trend")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "iac-reviewer-load")?.severity,
    ).toBe("warning");
  });

  it("warns when the DX team implements most infrastructure pull requests", () => {
    const insights = buildIacInsights({
      leadTimeMovingAvg: [],
      prsByReviewer: [],
      supervisedVsUnsupervised: [
        { cumulativeCount: 9, prType: "Supervised PRs" },
        { cumulativeCount: 1, prType: "Unsupervised PRs" },
      ],
    });

    const supervision = insights.find(
      (insight) => insight.id === "iac-supervision",
    );
    expect(supervision?.severity).toBe("warning");
    expect(supervision?.action).toBeDefined();
  });

  it("reports lead-time spread when provided", () => {
    const insights = buildIacInsights({
      leadTimeMovingAvg: [],
      leadTimePercentiles: { p50: 1, p85: 3, p95: 6 },
      prsByReviewer: [],
      supervisedVsUnsupervised: [],
    });

    expect(
      insights.find((insight) => insight.id === "iac-lead-time-spread")
        ?.severity,
    ).toBe("warning");
  });

  it("returns no insights for empty input", () => {
    expect(
      buildIacInsights({
        leadTimeMovingAvg: [],
        prsByReviewer: [],
        supervisedVsUnsupervised: [],
      }),
    ).toEqual([]);
  });
});
