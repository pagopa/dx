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

    expect(ids).toContain("pr-lead-time-change");
    expect(ids).toContain("pr-lead-time-target");
    expect(ids).toContain("pr-throughput-trend");

    const trend = insights.find(
      (insight) => insight.id === "pr-lead-time-change",
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
      (insight) => insight.id === "pr-lead-time-change",
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
      insights.find((insight) => insight.id === "pr-lead-time-change")?.value
        ?.deltaPct,
    ).toBeCloseTo(100);
  });

  it("labels the statistic behind each lead-time value", () => {
    const insights = buildPullRequestsInsights({
      ...baseInput(),
      cards: { avgLeadTime: 5.42 },
      leadTimePercentiles: { p50: 1.2, p85: 8, p95: 20.4 },
    });

    // The spread card headlines p95, not the average shown in the metric card,
    // so the two numbers must be named to avoid reading as a contradiction.
    expect(
      insights.find((insight) => insight.id === "pr-lead-time-spread")?.value
        ?.label,
    ).toBe("95th percentile");
    expect(
      insights.find((insight) => insight.id === "pr-lead-time-target")?.value
        ?.label,
    ).toBe("average");
    expect(
      insights.find((insight) => insight.id === "pr-lead-time-change")?.value
        ?.label,
    ).toBe("period average");
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

  it("carries the sample size so a reading is not mistaken for a large one", () => {
    const insights = buildPullRequestsInsights({
      ...baseInput(),
      leadTimePercentiles: { count: 7, p50: 1, p85: 4, p95: 8 },
    });

    expect(
      insights.find((insight) => insight.id === "pr-lead-time-spread")
        ?.sampleSize,
    ).toBe(7);
    expect(
      insights.find((insight) => insight.id === "pr-lead-time-target")
        ?.sampleSize,
    ).toBe(7);
  });

  it("links the slowest pull requests when the repository is known", () => {
    const insights = buildPullRequestsInsights(
      {
        ...baseInput(),
        slowestPrs: [
          { leadTimeDays: 9, number: 101, title: "Slow rollout" },
          { leadTimeDays: 4, number: 102, title: "Small fix" },
          { leadTimeDays: 2, number: 103, title: "Docs" },
        ],
      },
      "https://github.com/pagopa/dx",
    );

    const evidence = insights.find(
      (insight) => insight.id === "pr-slow-concentration",
    )?.evidence;

    expect(evidence?.[0]).toEqual({
      href: "https://github.com/pagopa/dx/pull/101",
      label: "#101 Slow rollout",
    });
  });
});
