/** Tests for Review & Collaboration insight rules. */

import { describe, expect, it } from "vitest";

import {
  buildCollaborationInsights,
  type CollaborationInsightsInput,
} from "@/lib/insights/collaboration";

const baseInput = (
  overrides: {
    awaitingReview?: CollaborationInsightsInput["awaitingReview"];
    summary?: Partial<CollaborationInsightsInput["summary"]>;
  } = {},
): CollaborationInsightsInput => ({
  awaitingReview: overrides.awaitingReview ?? [],
  summary: {
    avgTimeToFirstReviewHours: 10,
    awaitingReviewCount: 0,
    churnShare: 0.05,
    medianReviewRounds: 1,
    overdueAwaitingCount: 0,
    topReviewerShare: 0.2,
    totalReviews: 50,
    ...overrides.summary,
  },
});

const findInsight = (input: CollaborationInsightsInput, id: string) =>
  buildCollaborationInsights(input).find((insight) => insight.id === id);

describe("buildCollaborationInsights", () => {
  it("marks the first-review target positive when met", () => {
    expect(
      findInsight(
        baseInput({ summary: { avgTimeToFirstReviewHours: 24 } }),
        "collab-first-review-target",
      )?.severity,
    ).toBe("positive");
  });

  it("escalates the first-review target when missed", () => {
    expect(
      findInsight(
        baseInput({ summary: { avgTimeToFirstReviewHours: 70 } }),
        "collab-first-review-target",
      )?.severity,
    ).toBe("warning");

    expect(
      findInsight(
        baseInput({ summary: { avgTimeToFirstReviewHours: 120 } }),
        "collab-first-review-target",
      )?.severity,
    ).toBe("critical");
  });

  it("warns when reviews concentrate on one person and stays positive otherwise", () => {
    expect(
      findInsight(
        baseInput({ summary: { topReviewerShare: 0.8 } }),
        "collab-bus-factor",
      )?.severity,
    ).toBe("warning");

    expect(
      findInsight(
        baseInput({ summary: { topReviewerShare: 0.3 } }),
        "collab-bus-factor",
      )?.severity,
    ).toBe("positive");
  });

  it("warns on high review churn and stays positive otherwise", () => {
    expect(
      findInsight(
        baseInput({ summary: { churnShare: 0.5 } }),
        "collab-review-churn",
      )?.severity,
    ).toBe("warning");

    expect(
      findInsight(
        baseInput({ summary: { churnShare: 0.1 } }),
        "collab-review-churn",
      )?.severity,
    ).toBe("positive");
  });

  it("omits the awaiting-review insight when nothing is waiting", () => {
    expect(findInsight(baseInput(), "collab-awaiting-review")).toBeUndefined();
  });

  it("warns when the awaiting-review queue is mostly overdue and links the oldest PRs", () => {
    const insight = findInsight(
      baseInput({
        awaitingReview: [
          { number: 3, repository: "pagopa/dx", title: "Third" },
          { number: 2, repository: "pagopa/dx", title: "Second" },
          { number: 1, repository: "pagopa/dx", title: "First" },
          { number: 4, repository: "pagopa/dx", title: "Fourth" },
        ],
        summary: { awaitingReviewCount: 10, overdueAwaitingCount: 6 },
      }),
      "collab-awaiting-review",
    );

    expect(insight?.severity).toBe("warning");
    expect(insight?.sampleSize).toBe(10);
    expect(insight?.evidence).toEqual([
      { href: "https://github.com/pagopa/dx/pull/3", label: "#3 Third" },
      { href: "https://github.com/pagopa/dx/pull/2", label: "#2 Second" },
      { href: "https://github.com/pagopa/dx/pull/1", label: "#1 First" },
    ]);
  });

  it("keeps the review-rounds insight neutral", () => {
    const insight = findInsight(
      baseInput({ summary: { medianReviewRounds: 2 } }),
      "collab-review-rounds",
    );

    expect(insight?.severity).toBe("neutral");
    expect(insight?.value).toEqual({ current: 2, unit: "rounds" });
  });
});
