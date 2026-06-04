/**
 * Unit tests for tag-filter behavior on Advisor findings.
 *
 * These tests exercise the pure helper used by the Azure analyzer
 * orchestrator to keep filtering semantics explicit and stable.
 */

import { describe, expect, it } from "vitest";

import type { Finding } from "../../finding.js";

import { shouldIncludeAdvisorFindingForTags } from "../analyzer.js";

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
