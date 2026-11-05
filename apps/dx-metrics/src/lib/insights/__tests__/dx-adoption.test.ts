/** Tests for DX adoption insight rules. */

import { describe, expect, it } from "vitest";

import { buildDxAdoptionInsights } from "@/lib/insights/dx-adoption";

describe("buildDxAdoptionInsights", () => {
  it("reports adoption and drift against their targets", () => {
    const insights = buildDxAdoptionInsights({
      moduleAdoption: [
        { moduleCount: 6, moduleType: "DX Terraform Modules" },
        { moduleCount: 4, moduleType: "Non-DX Terraform Modules" },
      ],
      pipelineAdoption: [
        { pipelineCount: 9, pipelineType: "DX Pipelines" },
        { pipelineCount: 1, pipelineType: "Non-DX Pipelines" },
      ],
      versionDriftList: [
        {
          driftStatus: "outdated",
          latestVersion: "3.0.0",
          moduleName: "storage-account",
          usedVersion: "2.0.0",
        },
      ],
      versionDriftSummary: { outdated: 1, total: 10, unknown: 0, upToDate: 9 },
    });

    expect(
      insights.find((insight) => insight.id === "dx-adoption-pipeline")
        ?.severity,
    ).toBe("positive");
    expect(
      insights.find((insight) => insight.id === "dx-adoption-version-drift")
        ?.severity,
    ).toBe("positive");
  });

  it("warns when drift is above the allowed threshold", () => {
    const insights = buildDxAdoptionInsights({
      moduleAdoption: [],
      pipelineAdoption: [],
      versionDriftList: [
        {
          driftStatus: "outdated",
          latestVersion: "3.0.0",
          moduleName: "storage-account",
          usedVersion: "2.0.0",
        },
      ],
      versionDriftSummary: { outdated: 5, total: 10, unknown: 0, upToDate: 5 },
    });

    const drift = insights.find(
      (insight) => insight.id === "dx-adoption-version-drift",
    );
    expect(drift?.severity).toBe("warning");
    expect(drift?.action).toBeDefined();
  });

  it("collapses duplicated drift rows into unique evidence per module", () => {
    const insights = buildDxAdoptionInsights({
      moduleAdoption: [],
      pipelineAdoption: [],
      versionDriftList: [
        {
          driftStatus: "outdated",
          latestVersion: "4.0.0",
          moduleName: "pagopa-dx/azure-x/azurerm",
          usedVersion: "~> 2.0",
        },
        {
          driftStatus: "outdated",
          latestVersion: "4.0.0",
          moduleName: "pagopa-dx/azure-x/azurerm",
          usedVersion: "~> 2.0",
        },
        {
          driftStatus: "outdated",
          latestVersion: "3.0.0",
          moduleName: "pagopa-dx/azure-y/azurerm",
          usedVersion: "~> 1.0",
        },
      ],
      versionDriftSummary: { outdated: 3, total: 10, unknown: 0, upToDate: 7 },
    });

    const drift = insights.find(
      (insight) => insight.id === "dx-adoption-version-drift",
    );
    const labels = drift?.evidence?.map((item) => item.label) ?? [];

    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain("(2 files)");
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("returns no insights when there is nothing to report", () => {
    expect(
      buildDxAdoptionInsights({
        moduleAdoption: [],
        pipelineAdoption: [],
        versionDriftList: [],
        versionDriftSummary: { outdated: 0, total: 0, unknown: 0, upToDate: 0 },
      }),
    ).toEqual([]);
  });
});
