/** Tests for releases insight rules. */

import { describe, expect, it } from "vitest";

import { buildReleasesInsights } from "@/lib/insights/releases";

describe("buildReleasesInsights", () => {
  it("reports release cadence growth and stale modules", () => {
    const insights = buildReleasesInsights({
      modulesSummary: [
        { lastReleaseDate: "2026-06-01", moduleName: "storage-account" },
        { lastReleaseDate: "2024-01-01", moduleName: "legacy-module" },
      ],
      referenceDate: "2026-06-01T00:00:00.000Z",
      releasesTimeline: [
        { majorVersionsIntroduced: "1" },
        { majorVersionsIntroduced: "1" },
        { majorVersionsIntroduced: "3" },
        { majorVersionsIntroduced: "3" },
      ],
    });

    expect(
      insights.find((insight) => insight.id === "releases-cadence")?.severity,
    ).toBe("positive");

    const stale = insights.find(
      (insight) => insight.id === "releases-stale-modules",
    );
    expect(stale?.severity).toBe("warning");
    expect(stale?.evidence?.[0]?.label).toBe("legacy-module");
  });

  it("returns no insights when there is no data", () => {
    expect(
      buildReleasesInsights({
        modulesSummary: [],
        referenceDate: "2026-06-01T00:00:00.000Z",
        releasesTimeline: [],
      }),
    ).toEqual([]);
  });

  it("measures staleness against the registry reference date", () => {
    const insights = buildReleasesInsights({
      modulesSummary: [
        { lastReleaseDate: "2024-01-01", moduleName: "recent-module" },
        { lastReleaseDate: "2023-01-01", moduleName: "old-module" },
      ],
      // Anchored to the data (the registry's newest release), not the wall
      // clock, so a lagging importer does not mark every module as stale.
      referenceDate: "2024-02-01T00:00:00.000Z",
      releasesTimeline: [],
    });

    const stale = insights.find(
      (insight) => insight.id === "releases-stale-modules",
    );
    expect(stale?.value?.current).toBe(1);
    expect(stale?.evidence?.[0]?.label).toBe("old-module");
  });
});
