/** Tests for Copilot insight rules. */

import { describe, expect, it } from "vitest";

import { buildCopilotInsights } from "@/lib/insights/copilot";

const baseCards = {
  avgLeadTimeHoursWith: null,
  avgLeadTimeHoursWithout: null,
  copilotAuthoredMergedPrs: 0,
  copilotAuthoredPrs: 0,
  copilotReviewedPrs: 0,
  coverageShare: null,
  mergedPrs: 0,
};

const baseReviewCombination = {
  copilotAndHuman: 0,
  copilotOnly: 0,
  humanOnly: 0,
  noReview: 0,
};

describe("buildCopilotInsights", () => {
  it("flags low review adoption against the baseline", () => {
    const insights = buildCopilotInsights({
      cards: {
        ...baseCards,
        copilotReviewedPrs: 120,
        coverageShare: 0.12,
        mergedPrs: 1000,
      },
      reviewCombination: baseReviewCombination,
    });

    expect(
      insights.find((insight) => insight.id === "copilot-review-adoption")
        ?.severity,
    ).toBe("warning");
  });

  it("marks adoption on track once above the baseline", () => {
    const insights = buildCopilotInsights({
      cards: {
        ...baseCards,
        copilotReviewedPrs: 400,
        coverageShare: 0.4,
        mergedPrs: 1000,
      },
      reviewCombination: baseReviewCombination,
    });

    expect(
      insights.find((insight) => insight.id === "copilot-review-adoption")
        ?.severity,
    ).toBe("positive");
  });

  it("reads Copilot as complementary when paired with human review", () => {
    const insights = buildCopilotInsights({
      cards: baseCards,
      reviewCombination: {
        ...baseReviewCombination,
        copilotAndHuman: 474,
        copilotOnly: 3,
      },
    });

    expect(
      insights.find((insight) => insight.id === "copilot-review-pairing")
        ?.severity,
    ).toBe("positive");
  });

  it("warns when merges rely on a Copilot review alone", () => {
    const insights = buildCopilotInsights({
      cards: baseCards,
      reviewCombination: {
        ...baseReviewCombination,
        copilotAndHuman: 10,
        copilotOnly: 30,
      },
    });

    expect(
      insights.find((insight) => insight.id === "copilot-review-pairing")
        ?.severity,
    ).toBe("warning");
  });

  it("flags agent pull requests that fail to land", () => {
    const insights = buildCopilotInsights({
      cards: {
        ...baseCards,
        copilotAuthoredMergedPrs: 1,
        copilotAuthoredPrs: 4,
      },
      reviewCombination: baseReviewCombination,
    });

    expect(
      insights.find((insight) => insight.id === "copilot-agent-pr-outcome")
        ?.severity,
    ).toBe("warning");
  });

  it("reports the lead-time comparison as neutral correlation", () => {
    const insights = buildCopilotInsights({
      cards: {
        ...baseCards,
        avgLeadTimeHoursWith: 120,
        avgLeadTimeHoursWithout: 60,
      },
      reviewCombination: baseReviewCombination,
    });

    expect(
      insights.find((insight) => insight.id === "copilot-review-lead-time")
        ?.severity,
    ).toBe("neutral");
  });

  it("returns no insights without Copilot data", () => {
    expect(
      buildCopilotInsights({
        cards: baseCards,
        reviewCombination: baseReviewCombination,
      }),
    ).toEqual([]);
  });
});
