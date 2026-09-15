/** Tests for tracker insight rules. */

import { describe, expect, it } from "vitest";

import { buildTrackerInsights } from "@/lib/insights/tracker";

describe("buildTrackerInsights", () => {
  it("reports an open backlog and the top category", () => {
    const insights = buildTrackerInsights({
      byCategory: [
        { category: "Bug", requests: 6 },
        { category: "Feature", requests: 4 },
      ],
      cards: {
        avgClose: 3,
        closedTotal: 8,
        openedTotal: 10,
        requestsTrend: 12,
      },
    });

    expect(
      insights.find((insight) => insight.id === "tracker-backlog")?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "tracker-top-category")?.value
        ?.current,
    ).toBe(60);
  });

  it("marks a fully cleared backlog as positive", () => {
    const insights = buildTrackerInsights({
      byCategory: [],
      cards: {
        avgClose: 1,
        closedTotal: 10,
        openedTotal: 10,
        requestsTrend: 0,
      },
    });

    expect(
      insights.find((insight) => insight.id === "tracker-backlog")?.severity,
    ).toBe("positive");
  });

  it("returns no insights when cards are empty", () => {
    expect(
      buildTrackerInsights({
        byCategory: [],
        cards: {
          avgClose: null,
          closedTotal: null,
          openedTotal: null,
          requestsTrend: null,
        },
      }),
    ).toEqual([]);
  });
});
