/**
 * Unit tests for the categorisation of custom analyzer reasons.
 *
 * The per-resource analyzers describe governance observations and billable
 * waste in the same `reason` string, so the classifier is what keeps the
 * `cost` category meaning "money is being wasted".
 */

import { describe, expect, it } from "vitest";

import type { Finding } from "../../finding.js";

import {
  categorizeCustomFindings,
  MISSING_TAGS_REASON,
  NO_ANALYZER_REASON,
  unpreferredLocationReason,
} from "../finding-category.js";

const RESOURCE_ID =
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/disks/disk1";

function categorize(reason: string): Finding["category"] {
  const [finding] = categorizeCustomFindings([customFinding(reason)]);
  return finding.category;
}

function customFinding(reason: string): Finding {
  return {
    category: "cost",
    code: "custom.unknown",
    reason,
    resourceId: RESOURCE_ID,
    severity: "low",
    source: "custom",
  };
}

describe("categorizeCustomFindings", () => {
  it.each([
    MISSING_TAGS_REASON,
    NO_ANALYZER_REASON,
    unpreferredLocationReason("italynorth"),
    "Could not retrieve detailed NIC information.",
  ])("reports %j as operational excellence, not cost", (reason) => {
    expect(categorize(reason)).toBe("operationalExcellence");
  });

  it.each([
    "Disk is unattached.",
    "VM is deallocated.",
    "Public IP is not associated with any resource.",
  ])("keeps %j as a cost finding", (reason) => {
    expect(categorize(reason)).toBe("cost");
  });

  it("preserves every other field of the finding", () => {
    const finding: Finding = {
      ...customFinding(MISSING_TAGS_REASON),
      recommendedAction: "Add the required tags.",
      severity: "medium",
    };

    expect(categorizeCustomFindings([finding])).toEqual([
      { ...finding, category: "operationalExcellence" },
    ]);
  });
});
