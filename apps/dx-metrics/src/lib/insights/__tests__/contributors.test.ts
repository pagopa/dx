/** Tests for the contributors & ownership insight rules. */

import { describe, expect, it } from "vitest";

import {
  buildContributorsInsights,
  type ContributorsInsightsInput,
} from "@/lib/insights/contributors";

const baseSummary = {
  mergedPrCount: 100,
  topContributorShare: 0.3,
  topMergerShare: 0.8,
  totalCommits: 100,
};

const baseInput = (
  overrides: Partial<ContributorsInsightsInput> = {},
): ContributorsInsightsInput => ({
  mergers: [
    { login: "alice", merges: 80, share: 0.8 },
    { login: "bob", merges: 20, share: 0.2 },
  ],
  ownershipByRepo: [
    {
      repository: "pagopa/dx",
      topAuthor: "alice",
      topAuthorCommits: 30,
      topAuthorShare: 0.3,
      totalCommits: 100,
    },
  ],
  summary: baseSummary,
  ...overrides,
});

const findInsight = (
  input: ContributorsInsightsInput,
  id: string,
): ReturnType<typeof buildContributorsInsights>[number] | undefined =>
  buildContributorsInsights(input).find((insight) => insight.id === id);

describe("buildContributorsInsights", () => {
  it("flags a merge bus factor warning and names the busiest merger", () => {
    const insight = findInsight(baseInput(), "merge-bus-factor");

    expect(insight?.severity).toBe("warning");
    expect(insight?.category).toBe("risk");
    expect(insight?.detail).toContain("alice");
    expect(insight?.value?.current).toBe(80);
    expect(insight?.value?.unit).toBe("%");
    expect(insight?.action).toBe(
      "Spend merge rights wider so one person's absence cannot stall merges.",
    );
  });

  it("does not flag the merge bus factor when merge rights are spread", () => {
    const insight = findInsight(
      baseInput({
        mergers: [
          { login: "alice", merges: 14, share: 0.14 },
          { login: "bob", merges: 13, share: 0.13 },
          { login: "carol", merges: 13, share: 0.13 },
        ],
        summary: { ...baseSummary, topMergerShare: 0.14 },
      }),
      "merge-bus-factor",
    );

    expect(insight?.severity).toBe("positive");
  });

  it("caps the merge bus factor at a warning because a share cannot exceed 1", () => {
    // The configured threshold is 0.5 with a 2x critical multiplier, so even a
    // merger who performs every merge (share = 1) stays a warning.
    const insight = findInsight(
      baseInput({
        mergers: [{ login: "alice", merges: 100, share: 1 }],
        summary: { ...baseSummary, topMergerShare: 1 },
      }),
      "merge-bus-factor",
    );

    expect(insight?.severity).toBe("warning");
  });

  it("flags ownership concentration across repositories", () => {
    const insight = findInsight(
      baseInput({
        ownershipByRepo: [
          {
            repository: "pagopa/dx",
            topAuthor: "alice",
            topAuthorCommits: 90,
            topAuthorShare: 0.9,
            totalCommits: 100,
          },
          {
            repository: "pagopa/io-app",
            topAuthor: "bob",
            topAuthorCommits: 80,
            topAuthorShare: 0.8,
            totalCommits: 100,
          },
        ],
      }),
      "ownership-bus-factor",
    );

    expect(insight?.severity).toBe("warning");
    expect(insight?.category).toBe("risk");
    expect(insight?.value?.current).toBe(100);
  });

  it("reports spread ownership as positive", () => {
    const insight = findInsight(baseInput(), "ownership-bus-factor");

    expect(insight?.severity).toBe("positive");
  });

  it("flags authoring load concentrated on one person", () => {
    const insight = findInsight(
      baseInput({
        summary: { ...baseSummary, topContributorShare: 0.8 },
      }),
      "contributor-concentration",
    );

    expect(insight?.severity).toBe("warning");
    expect(insight?.value?.current).toBe(80);
  });

  it("reports distributed authoring load as positive", () => {
    const insight = findInsight(baseInput(), "contributor-concentration");

    expect(insight?.severity).toBe("positive");
  });

  it("returns no merge or authoring insights when nothing merged", () => {
    const insights = buildContributorsInsights(
      baseInput({
        mergers: [],
        ownershipByRepo: [],
        summary: {
          mergedPrCount: 0,
          topContributorShare: 0,
          topMergerShare: 0,
          totalCommits: 0,
        },
      }),
    );

    expect(insights).toEqual([]);
  });

  it("keeps the ownership insight when repositories have commits but no merges", () => {
    const insights = buildContributorsInsights(
      baseInput({
        mergers: [],
        summary: {
          mergedPrCount: 0,
          topContributorShare: 0,
          topMergerShare: 0,
          totalCommits: 100,
        },
      }),
    );

    const ids = insights.map((insight) => insight.id);
    expect(ids).toEqual(["ownership-bus-factor"]);
  });
});
