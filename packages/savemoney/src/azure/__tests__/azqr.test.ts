/**
 * Tests for the AZQR ingestion module.
 *
 * Cover the behaviours CES-2192 requires:
 * 1. `parseAzqrReport` validates the JSON shape (accept valid, reject invalid).
 * 2. `isAzqrReportMasked` detects AZQR's default subscription-ID masking.
 * 3. `classifyAzqrRow` / `azqrImpactedToFindings` promote billable waste as
 *    `cost`, orphaned free resources as `cleanup` candidates, and drop
 *    security / reliability / best-practice noise.
 * 4. Impact → severity mapping and inventory enrichment.
 */

import { describe, expect, it } from "vitest";

import {
  type AzqrImpactedRow,
  azqrImpactedToFindings,
  classifyAzqrRow,
  isAzqrReportMasked,
  parseAzqrReport,
} from "../azqr.js";

const REAL_SUB = "ec285037-c673-4f58-b594-d7c480da4e8b";
const MASKED_SUB = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxx0da4e8b";

function impactedRow(
  overrides: Partial<AzqrImpactedRow> = {},
): AzqrImpactedRow {
  return {
    category: "Security",
    impact: "Medium",
    recommendation: "Some best practice",
    resourceId: resourceId(
      REAL_SUB,
      "microsoft.network/networksecuritygroups",
      "nsg",
    ),
    resourceType: "microsoft.network/networksecuritygroups",
    source: "APRL",
    ...overrides,
  };
}

/** An orphaned (AOR) resource row of the given type. */
function orphanRow(
  resourceType: string,
  overrides: Partial<AzqrImpactedRow> = {},
): AzqrImpactedRow {
  return impactedRow({
    category: "Governance",
    resourceId: resourceId(REAL_SUB, resourceType, "res"),
    resourceType,
    source: "AOR",
    ...overrides,
  });
}

function resourceId(sub: string, type: string, name: string): string {
  return `/subscriptions/${sub}/resourcegroups/rg/providers/${type}/${name}`;
}

describe("parseAzqrReport", () => {
  it("accepts a valid report and defaults missing arrays", () => {
    const report = parseAzqrReport({ impacted: [impactedRow()] });
    expect(report.impacted).toHaveLength(1);
    expect(report.inventory).toEqual([]);
  });

  it("strips unknown top-level sections", () => {
    const report = parseAzqrReport({
      advisor: [{ anything: true }],
      impacted: [],
      recommendations: [{ foo: "bar" }],
    });
    expect(report.impacted).toEqual([]);
  });

  it("throws with a cause when an impacted row misses required fields", () => {
    expect(() => parseAzqrReport({ impacted: [{ impact: "High" }] })).toThrow(
      /Invalid AZQR report/,
    );
  });
});

describe("isAzqrReportMasked", () => {
  it("detects masked subscription IDs in resource IDs", () => {
    const report = parseAzqrReport({
      impacted: [
        impactedRow({
          resourceId: resourceId(
            MASKED_SUB,
            "microsoft.network/publicipaddresses",
            "pip",
          ),
        }),
      ],
    });
    expect(isAzqrReportMasked(report)).toBe(true);
  });

  it("returns false when IDs carry the real subscription GUID", () => {
    const report = parseAzqrReport({ impacted: [impactedRow()] });
    expect(isAzqrReportMasked(report)).toBe(false);
  });
});

describe("classifyAzqrRow", () => {
  it("classifies rows AZQR categorises as Cost as cost", () => {
    expect(classifyAzqrRow(impactedRow({ category: "Cost" }))).toBe("cost");
  });

  it("classifies orphaned billable resources as cost", () => {
    expect(
      classifyAzqrRow(
        orphanRow("microsoft.network/publicipaddresses", {
          recommendation: "Public IPs not attached to any resource",
        }),
      ),
    ).toBe("cost");
  });

  it("classifies orphaned free resources (NSG, subnet, …) as cleanup", () => {
    expect(
      classifyAzqrRow(
        orphanRow("microsoft.network/networksecuritygroups", {
          recommendation:
            "Network Security Groups not attached to any network interface or subnet",
        }),
      ),
    ).toBe("cleanup");
  });

  it("drops non-orphan security / reliability best-practice rows", () => {
    expect(
      classifyAzqrRow(
        impactedRow({
          category: "Security",
          recommendation: "Enable diagnostic settings",
          resourceType: "microsoft.web/serverfarms",
        }),
      ),
    ).toBeNull();
  });

  it("does not promote orphan-sounding text unless the AOR source tags it", () => {
    expect(
      classifyAzqrRow(
        impactedRow({
          category: "Governance",
          recommendation: "Public IPs not attached to any resource",
          resourceType: "microsoft.network/publicipaddresses",
          source: "APRL",
        }),
      ),
    ).toBeNull();
  });
});

describe("azqrImpactedToFindings", () => {
  it("maps billable orphans to cost findings and drops non-orphan noise", () => {
    const report = parseAzqrReport({
      impacted: [
        orphanRow("microsoft.web/serverfarms", {
          impact: "High",
          recommendation: "App Service plans without hosting Apps",
          recommendationId: "app-service-empty",
          resourceId: resourceId(REAL_SUB, "microsoft.web/serverfarms", "asp"),
        }),
        impactedRow(), // non-orphan APRL noise → dropped
      ],
    });

    const findings = azqrImpactedToFindings(report);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "cost",
      code: "azqr.app-service-empty",
      severity: "high",
      source: "azqr",
    });
    expect(findings[0].estimatedMonthlySavings).toBeUndefined();
    expect(findings[0].recommendedAction).toContain("Review the resource");
  });

  it("maps orphaned free resources to low-severity cleanup candidates", () => {
    const report = parseAzqrReport({
      impacted: [
        orphanRow("microsoft.network/virtualnetworks", {
          impact: "Medium",
          recommendation: "Subnets without Connected Devices or Delegation",
          recommendationId: "empty-subnet",
        }),
      ],
    });

    const [finding] = azqrImpactedToFindings(report);
    expect(finding).toMatchObject({
      category: "operationalExcellence",
      code: "azqr.empty-subnet",
      severity: "low",
      source: "azqr",
    });
    expect(finding.recommendedAction).toContain("no direct cost");
  });

  it("enriches the reason with inventory SKU / location when available", () => {
    const id = resourceId(REAL_SUB, "microsoft.network/natgateways", "nat");
    const report = parseAzqrReport({
      impacted: [
        orphanRow("microsoft.network/natgateways", {
          recommendation: "NAT Gateways not attached to any subnet",
          resourceId: id,
        }),
      ],
      inventory: [
        { location: "italynorth", resourceId: id, skuName: "Standard" },
      ],
    });

    const [finding] = azqrImpactedToFindings(report);
    expect(finding.reason).toContain("Standard");
    expect(finding.reason).toContain("italynorth");
  });

  it("defaults severity to low for unknown impact on cost rows", () => {
    const report = parseAzqrReport({
      impacted: [
        impactedRow({
          category: "Cost",
          impact: undefined,
          resourceType: "microsoft.compute/disks",
        }),
      ],
    });
    expect(azqrImpactedToFindings(report)[0].severity).toBe("low");
  });
});
