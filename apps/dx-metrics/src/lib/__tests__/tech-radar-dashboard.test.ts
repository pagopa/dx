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

    expect(result.summary.repositoriesTotal).toBe(3);
    expect(result.summary.repositoriesWithDetectedTools).toBe(2);
    expect(result.summary.detectedUsages).toBe(3);
    expect(result.summary.usagesNotInRadar).toBe(1);
    expect(result.adoptionByTool).toEqual([
      expect.objectContaining({
        adoptionPercentage: 33.3,
        repositoryCount: 1,
        toolKey: "nx",
      }),
      expect.objectContaining({
        adoptionPercentage: 33.3,
        repositoryCount: 1,
        toolKey: "pnpm",
      }),
      expect.objectContaining({
        adoptionPercentage: 33.3,
        repositoryCount: 1,
        toolKey: "turborepo",
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
