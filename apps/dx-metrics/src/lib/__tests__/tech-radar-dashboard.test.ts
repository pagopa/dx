/** This module validates Techradar dashboard aggregation logic. */

import { describe, expect, it } from "vitest";

import type { TechRadarUsageRow } from "@/adapters/db/techradar/schemas";

import { buildTechRadarDashboardData } from "../tech-radar-dashboard.js";

describe("buildTechRadarDashboardData", () => {
  it("computes adoption percentages and radar grouping", () => {
    const rows: readonly TechRadarUsageRow[] = [
      {
        evidencePath: "pnpm-lock.yaml",
        radarRef: "https://dx.pagopa.it/radar/pnpm",
        radarRing: "assess",
        radarSlug: "pnpm",
        radarStatus: "aligned",
        radarTitle: "pnpm",
        repositoryFullName: "pagopa/dx",
        toolKey: "pnpm",
        toolName: "pnpm",
      },
      {
        evidencePath: "nx.json",
        radarRef: null,
        radarRing: null,
        radarSlug: null,
        radarStatus: "not-in-radar",
        radarTitle: null,
        repositoryFullName: "pagopa/dx",
        toolKey: "nx",
        toolName: "Nx",
      },
      {
        evidencePath: "turbo.json",
        radarRef: "https://dx.pagopa.it/radar/turborepo",
        radarRing: "adopt",
        radarSlug: "turborepo",
        radarStatus: "aligned",
        radarTitle: "Turborepo",
        repositoryFullName: "pagopa/selfcare",
        toolKey: "turborepo",
        toolName: "Turborepo",
      },
    ];

    const result = buildTechRadarDashboardData(rows, [
      "pagopa/dx",
      "pagopa/selfcare",
      "pagopa/io-wallet",
    ]);

    expect(result.summary.repositories_total).toBe(3);
    expect(result.summary.repositories_with_detected_tools).toBe(2);
    expect(result.summary.detected_usages).toBe(3);
    expect(result.summary.usages_not_in_radar).toBe(1);
    expect(result.adoptionByTool).toEqual([
      expect.objectContaining({
        adoption_percentage: 33.3,
        repository_count: 1,
        tool_key: "nx",
      }),
      expect.objectContaining({
        adoption_percentage: 33.3,
        repository_count: 1,
        tool_key: "pnpm",
      }),
      expect.objectContaining({
        adoption_percentage: 33.3,
        repository_count: 1,
        tool_key: "turborepo",
      }),
    ]);
    expect(result.statusDistribution).toEqual([
      { name: "adopt", value: 1 },
      { name: "assess", value: 1 },
      { name: "Not in radar", value: 1 },
    ]);
    expect(result.repositoriesWithoutDetectedTools).toEqual([
      "pagopa/io-wallet",
    ]);
  });
});
