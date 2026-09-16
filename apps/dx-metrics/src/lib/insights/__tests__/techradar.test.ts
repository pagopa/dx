/** Tests for techradar insight rules. */

import { TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY } from "@pagopa/dx-metrics-core/config";
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

  it("sums rows for the same tool and snapshot before comparing", () => {
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
          repositoryCount: 2,
          toolKey: "nx",
          toolName: "Nx",
        },
        {
          capturedAt: "2026-01-01T00:00:00.000Z",
          repositoryCount: 3,
          toolKey: "nx",
          toolName: "Nx",
        },
        {
          capturedAt: "2026-02-01T00:00:00.000Z",
          repositoryCount: 9,
          toolKey: "nx",
          toolName: "Nx",
        },
      ],
    });

    const trend = insights.find(
      (insight) => insight.id === "techradar-usage-trend",
    );
    // The first snapshot is the sum of its two rows (2 + 3), not a row pick.
    expect(trend?.value?.previous).toBe(5);
    expect(trend?.value?.current).toBe(9);
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

  it("ignores the zero-adoption snapshot marker in the usage trend", () => {
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
          repositoryCount: 4,
          toolKey: "nx",
          toolName: "Nx",
        },
        {
          capturedAt: "2026-02-01T00:00:00.000Z",
          repositoryCount: 0,
          toolKey: TECH_RADAR_SNAPSHOT_MARKER_TOOL_KEY,
          toolName: "No detected tools",
        },
      ],
    });

    // The marker is not a tool, so it never becomes a usage-trend reading.
    expect(
      insights.find((insight) => insight.id === "techradar-usage-trend"),
    ).toBeUndefined();
  });
});
