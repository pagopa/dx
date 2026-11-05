/** Tests for pull-request review insight rules. */

import { describe, expect, it } from "vitest";

import { buildPullRequestsReviewInsights } from "@/lib/insights/pull-requests-review";

describe("buildPullRequestsReviewInsights", () => {
  it("flags review-side wait and reviewer concentration", () => {
    const insights = buildPullRequestsReviewInsights({
      cards: { avgTimeToFirstReview: 30, avgTimeToMerge: 10 },
      mergedWithoutReviewShare: 0.5,
      reviewDistribution: [
        { changeRequests: 1, reviewer: "alice", totalReviews: 80 },
        { changeRequests: 0, reviewer: "bob", totalReviews: 20 },
      ],
      timeToFirstReviewTrend: [
        { avgHoursToFirstReview: 1 },
        { avgHoursToFirstReview: 1 },
        { avgHoursToFirstReview: 4 },
        { avgHoursToFirstReview: 4 },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "review-vs-merge-split")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "review-bus-factor")?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "review-latency-trend")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "review-merged-without-review")
        ?.severity,
    ).toBe("warning");
  });

  it("reports first-review spread when percentiles are provided", () => {
    const insights = buildPullRequestsReviewInsights({
      cards: { avgTimeToFirstReview: 1, avgTimeToMerge: 1 },
      firstReviewPercentiles: { p50: 5, p85: 20, p95: 40 },
      mergedWithoutReviewShare: 0,
      reviewDistribution: [],
      timeToFirstReviewTrend: [],
    });

    expect(
      insights.find((insight) => insight.id === "review-first-review-spread")
        ?.severity,
    ).toBe("warning");
  });

  it("returns no insights when there is no review data", () => {
    expect(
      buildPullRequestsReviewInsights({
        cards: { avgTimeToFirstReview: null, avgTimeToMerge: null },
        mergedWithoutReviewShare: null,
        reviewDistribution: [],
        timeToFirstReviewTrend: [],
      }),
    ).toEqual([]);
  });
});
