/** Tests for techradar insight rules. */

import { describe, expect, it } from "vitest";

import { buildTechRadarInsights } from "@/lib/insights/techradar";

describe("buildTechRadarInsights", () => {
  it("warns about low coverage and tools outside the radar", () => {
    const insights = buildTechRadarInsights({
      adoptionByTool: [
        {
          adoptionPercentage: 80,
          radarStatus: "aligned",
          repositoryCount: 8,
          toolName: "nx",
        },
      ],
      summary: {
        detectedUsages: 10,
        repositoriesTotal: 10,
        repositoriesWithDetectedTools: 2,
        toolsDetected: 1,
        usagesNotInRadar: 6,
      },
    });

    expect(
      insights.find((insight) => insight.id === "techradar-coverage")?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "techradar-governance-gap")
        ?.severity,
    ).toBe("warning");
  });

  it("reports the tool with the largest adoption change", () => {
    const insights = buildTechRadarInsights({
      adoptionByTool: [],
      summary: {
        detectedUsages: 0,
        repositoriesTotal: 0,
        repositoriesWithDetectedTools: 0,
        toolsDetected: 0,
        usagesNotInRadar: 0,
      },
      usageTrend: [
        {
          capturedAt: "2026-01-01T00:00:00.000Z",
          repositoryCount: 1,
          toolKey: "nx",
          toolName: "Nx",
        },
        {
          capturedAt: "2026-02-01T00:00:00.000Z",
          repositoryCount: 5,
          toolKey: "nx",
          toolName: "Nx",
        },
      ],
    });

    const trend = insights.find(
      (insight) => insight.id === "techradar-usage-trend",
    );
    expect(trend?.severity).toBe("positive");
    expect(trend?.value?.current).toBe(5);
  });

  it("returns no insights when there are no detections", () => {
    expect(
      buildTechRadarInsights({
        adoptionByTool: [],
        summary: {
          detectedUsages: 0,
          repositoriesTotal: 0,
          repositoriesWithDetectedTools: 0,
          toolsDetected: 0,
          usagesNotInRadar: 0,
        },
      }),
    ).toEqual([]);
  });
});
