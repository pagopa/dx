/**
 * Unit tests for tag-filter behavior on Advisor findings.
 *
 * These tests exercise the pure helper used by the Azure analyzer
 * orchestrator to keep filtering semantics explicit and stable.
 */

import { describe, expect, it } from "vitest";

import type { Finding } from "../../finding.js";
import type { AzureDetailedResourceReport } from "../types.js";

import {
  mergeFinding,
  shouldIncludeAdvisorFindingForTags,
} from "../analyzer.js";

function mkFinding(resourceId: string, source: Finding["source"]): Finding {
  return {
    category: "cost",
    code: `${source}.test`,
    reason: "Test finding.",
    resourceId,
    severity: "low",
    source,
  };
}

describe("shouldIncludeAdvisorFindingForTags", () => {
  it("includes all findings when no tag filter is active", () => {
    const finding = mkFinding(
      "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1",
      "advisor",
    );

    expect(
      shouldIncludeAdvisorFindingForTags(finding, new Set<string>(), false),
    ).toBe(true);
  });

  it("keeps subscription-level Advisor findings global even with tag filters", () => {
    const finding = mkFinding("/subscriptions/sub1", "advisor");

    expect(
      shouldIncludeAdvisorFindingForTags(finding, new Set<string>(), true),
    ).toBe(true);
  });

  it("includes resource-level Advisor findings only when resource id is tag-matched", () => {
    const finding = mkFinding(
      "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1",
      "advisor",
    );

    const taggedResourceIds = new Set<string>([
      "/subscriptions/sub1/resourcegroups/rg1/providers/microsoft.compute/virtualmachines/vm1",
    ]);

    expect(
      shouldIncludeAdvisorFindingForTags(finding, taggedResourceIds, true),
    ).toBe(true);
  });

  it("excludes resource-level Advisor findings when resource id is not tag-matched", () => {
    const finding = mkFinding(
      "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm2",
      "advisor",
    );

    const taggedResourceIds = new Set<string>([
      "/subscriptions/sub1/resourcegroups/rg1/providers/microsoft.compute/virtualmachines/vm1",
    ]);

    expect(
      shouldIncludeAdvisorFindingForTags(finding, taggedResourceIds, true),
    ).toBe(false);
  });
});

describe("mergeFinding", () => {
  it("preserves custom cost at risk when merging an Advisor finding", () => {
    const resourceId =
      "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1";
    const existing: AzureDetailedResourceReport = {
      analysis: {
        costRisk: "high",
        estimatedMonthlyCostAtRisk: { amount: 29.94, currency: "EUR" },
        reason: "VM is deallocated.",
        suspectedUnused: true,
      },
      findings: [mkFinding(resourceId, "custom")],
      resource: {
        id: resourceId,
        name: "vm1",
        type: "Microsoft.Compute/virtualMachines",
      },
    };
    const reports = [existing];
    const reportsById = new Map([[resourceId.toLowerCase(), existing]]);

    mergeFinding(mkFinding(resourceId, "advisor"), reports, reportsById);

    expect(existing.analysis.estimatedMonthlyCostAtRisk).toEqual({
      amount: 29.94,
      currency: "EUR",
    });
    expect(existing.findings).toHaveLength(2);
  });
});
