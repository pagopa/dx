/** Tests for workflow insight rules. */

import { describe, expect, it } from "vitest";

import { buildWorkflowsInsights } from "@/lib/insights/workflows";

describe("buildWorkflowsInsights", () => {
  it("flags the failure hotspot and the workflow below target", () => {
    const insights = buildWorkflowsInsights({
      cumulativeDuration: [
        { cumulativeDurationMinutes: 100, workflowName: "CI" },
        { cumulativeDurationMinutes: 10, workflowName: "Deploy" },
      ],
      deployments: [{ weeklyDeploymentCount: 2 }, { weeklyDeploymentCount: 2 }],
      failures: [
        { failedRuns: 5, workflowName: "CI" },
        { failedRuns: 1, workflowName: "Deploy" },
      ],
      successRatio: [
        {
          failedRuns: 8,
          successRatePercentage: 60,
          totalRuns: 20,
          workflowName: "CI",
        },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "workflow-failure-hotspot")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "workflow-success-rate")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "workflow-deployment-frequency")
        ?.severity,
    ).toBe("positive");
  });

  it("marks success rates as positive when above target", () => {
    const insights = buildWorkflowsInsights({
      cumulativeDuration: [],
      deployments: [],
      failures: [],
      successRatio: [
        {
          failedRuns: 1,
          successRatePercentage: 99,
          totalRuns: 100,
          workflowName: "CI",
        },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "workflow-success-rate")
        ?.severity,
    ).toBe("positive");
  });

  it("flags CI time wasted on failed runs", () => {
    const insights = buildWorkflowsInsights({
      cumulativeDuration: [],
      deployments: [],
      failures: [],
      successRatio: [],
      summary: { failedDurationMinutes: 30, totalDurationMinutes: 70 },
    });

    const waste = insights.find(
      (insight) => insight.id === "workflow-failed-run-waste",
    );
    expect(waste?.severity).toBe("warning");
  });

  it("reports overall success rate and duration spread", () => {
    const insights = buildWorkflowsInsights({
      cumulativeDuration: [],
      deployments: [],
      durationPercentiles: { p50: 10, p85: 20, p95: 90 },
      failures: [],
      successRatio: [],
      successRateStats: { current: 50, previous: 60 },
    });

    expect(
      insights.find((insight) => insight.id === "workflow-overall-success-rate")
        ?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "workflow-duration-spread")
        ?.severity,
    ).toBe("warning");
  });

  it("ignores success rates with too few runs", () => {
    const insights = buildWorkflowsInsights({
      cumulativeDuration: [],
      deployments: [],
      failures: [],
      successRatio: [
        {
          failedRuns: 1,
          successRatePercentage: 0,
          totalRuns: 1,
          workflowName: "Flaky",
        },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "workflow-success-rate"),
    ).toBeUndefined();
  });
});
