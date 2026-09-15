/** Tests for pull-request insight rules. */

import { describe, expect, it } from "vitest";

import {
  buildPullRequestsInsights,
  type PullRequestsInsightsInput,
} from "@/lib/insights/pull-requests";

const baseInput = (): PullRequestsInsightsInput => ({
  cards: { avgLeadTime: 5 },
  leadTimeMovingAvg: [
    { avgLeadTimeDays: 1 },
    { avgLeadTimeDays: 1 },
    { avgLeadTimeDays: 4 },
    { avgLeadTimeDays: 4 },
  ],
  mergedPrs: [{ prCount: 10 }, { prCount: 10 }, { prCount: 5 }, { prCount: 5 }],
  prSizeDistribution: [
    { prCount: 8, sizeRange: "0-50" },
    { prCount: 2, sizeRange: "1000+" },
  ],
  slowestPrs: [{ leadTimeDays: 10 }, { leadTimeDays: 1 }],
  unmergedPrs: [{ openPrs: 2 }, { openPrs: 2 }, { openPrs: 5 }, { openPrs: 5 }],
});

describe("buildPullRequestsInsights", () => {
  it("flags a worsening lead time above target", () => {
    const insights = buildPullRequestsInsights(baseInput());
    const ids = insights.map((insight) => insight.id);

    expect(ids).toContain("pr-lead-time-trend");
    expect(ids).toContain("pr-lead-time-target");
    expect(ids).toContain("pr-throughput-trend");

    const trend = insights.find(
      (insight) => insight.id === "pr-lead-time-trend",
    );
    expect(trend?.severity).toBe("warning");
  });

  it("marks lead time within target as positive", () => {
    const input = baseInput();
    const insights = buildPullRequestsInsights({
      ...input,
      cards: { avgLeadTime: 1 },
      leadTimeMovingAvg: [
        { avgLeadTimeDays: 4 },
        { avgLeadTimeDays: 4 },
        { avgLeadTimeDays: 1 },
        { avgLeadTimeDays: 1 },
      ],
    });

    const trend = insights.find(
      (insight) => insight.id === "pr-lead-time-trend",
    );
    expect(trend?.severity).toBe("positive");
  });

  it("warns about large PRs when they dominate", () => {
    const input = baseInput();
    const insights = buildPullRequestsInsights({
      ...input,
      prSizeDistribution: [
        { prCount: 1, sizeRange: "0-50" },
        { prCount: 9, sizeRange: "1000+" },
      ],
    });

    const size = insights.find((insight) => insight.id === "pr-size-risk");
    expect(size?.severity).toBe("warning");
  });

  it("reports lead-time spread and period delta", () => {
    const insights = buildPullRequestsInsights({
      ...baseInput(),
      cards: { avgLeadTime: 6 },
      leadTimePercentiles: { p50: 1, p85: 4, p95: 8 },
      previousLeadTime: 3,
    });

    expect(
      insights.find((insight) => insight.id === "pr-lead-time-spread")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "pr-lead-time-trend")?.value
        ?.deltaPct,
    ).toBeCloseTo(100);
  });

  it("escalates a lead time far beyond the target to critical", () => {
    const insights = buildPullRequestsInsights({
      ...baseInput(),
      cards: { avgLeadTime: 20 },
    });

    expect(
      insights.find((insight) => insight.id === "pr-lead-time-target")
        ?.severity,
    ).toBe("critical");
  });

  it("returns no insights for a period with no activity", () => {
    const insights = buildPullRequestsInsights({
      cards: { avgLeadTime: null },
      leadTimeMovingAvg: [],
      mergedPrs: [
        { prCount: 0 },
        { prCount: 0 },
        { prCount: 0 },
        { prCount: 0 },
      ],
      prSizeDistribution: [],
      slowestPrs: [],
      unmergedPrs: [
        { openPrs: 0 },
        { openPrs: 0 },
        { openPrs: 0 },
        { openPrs: 0 },
      ],
    });

    expect(insights).toEqual([]);
  });

  it("returns no insights for empty data", () => {
    const insights = buildPullRequestsInsights({
      cards: { avgLeadTime: null },
      leadTimeMovingAvg: [],
      mergedPrs: [],
      prSizeDistribution: [],
      slowestPrs: [],
      unmergedPrs: [],
    });

    expect(insights).toEqual([]);
  });
});
