/**
 * Unit tests for cross-source finding deduplication.
 *
 * The same waste can be reported by AZQR, Azure Advisor and the custom
 * analyzers at once. These tests pin down when the incoming finding collapses
 * onto an existing one, and what the surviving finding is expected to carry.
 */

import { describe, expect, it } from "vitest";

import type { Finding } from "../../finding.js";
import type { AzureDetailedResourceReport } from "../types.js";

import {
  foldDuplicateFinding,
  orphanRecommendationId,
} from "../finding-dedup.js";

const RESOURCE_ID =
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/disks/disk1";

const ORPHAN_DISK = orphanRecommendationId("Microsoft.Compute/disks");

function mkFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: "cost",
    code: "custom.unknown",
    reason: "Disk is unattached.",
    resourceId: RESOURCE_ID,
    severity: "low",
    source: "custom",
    ...overrides,
  };
}

function mkReport(findings: Finding[]): AzureDetailedResourceReport {
  return {
    analysis: {
      costRisk: "low",
      reason: findings.map((finding) => finding.reason).join(" "),
      suspectedUnused: true,
    },
    findings,
    resource: {
      id: RESOURCE_ID,
      name: "disk1",
      type: "Microsoft.Compute/disks",
    },
  };
}

describe("orphanRecommendationId", () => {
  it("normalises the resource type so sources share one identity", () => {
    expect(ORPHAN_DISK).toBe("orphan.microsoft.compute/disks");
  });
});

describe("foldDuplicateFinding", () => {
  it("keeps findings without a recommendation id separate", () => {
    const report = mkReport([mkFinding({ reason: "No tags found." })]);

    expect(foldDuplicateFinding(mkFinding(), report)).toBe(false);
    expect(report.findings).toHaveLength(1);
  });

  it("folds a finding sharing the same recommendation id", () => {
    const report = mkReport([
      mkFinding({ recommendationId: ORPHAN_DISK, source: "advisor" }),
    ]);

    const folded = foldDuplicateFinding(
      mkFinding({
        recommendationId: ORPHAN_DISK.toUpperCase(),
        source: "azqr",
      }),
      report,
    );

    expect(folded).toBe(true);
    expect(report.findings).toHaveLength(1);
  });

  it("folds an AZQR orphan row onto the live cost finding for the same resource", () => {
    const report = mkReport([mkFinding()]);

    const folded = foldDuplicateFinding(
      mkFinding({
        recommendationId: ORPHAN_DISK,
        severity: "high",
        source: "azqr",
      }),
      report,
    );

    expect(folded).toBe(true);
    expect(report.findings?.[0]).toMatchObject({
      reason:
        "Disk is unattached. Also flagged by azqr as an orphaned resource.",
      severity: "high",
      source: "custom",
    });
  });

  it("adopts the canonical identity of the finding it absorbs", () => {
    const report = mkReport([mkFinding()]);

    foldDuplicateFinding(
      mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
      report,
    );

    expect(report.findings?.[0].recommendationId).toBe(ORPHAN_DISK);
  });

  it("records the corroborating source in the per-resource summary too", () => {
    const report = mkReport([mkFinding()]);

    foldDuplicateFinding(
      mkFinding({
        recommendationId: ORPHAN_DISK,
        severity: "high",
        source: "azqr",
      }),
      report,
    );

    expect(report.analysis).toMatchObject({
      costRisk: "high",
      reason:
        "Disk is unattached. Also flagged by azqr as an orphaned resource.",
    });
  });

  it("keeps the monetary estimate of whichever finding carries one", () => {
    const report = mkReport([mkFinding({ recommendationId: ORPHAN_DISK })]);

    foldDuplicateFinding(
      mkFinding({
        estimatedMonthlySavings: { amount: 12.5, currency: "EUR" },
        recommendationId: ORPHAN_DISK,
        source: "azqr",
      }),
      report,
    );

    expect(report.findings?.[0].estimatedMonthlySavings).toEqual({
      amount: 12.5,
      currency: "EUR",
    });
  });

  it("does not fold an orphan row onto a governance-only finding", () => {
    const report = mkReport([
      mkFinding({
        category: "operationalExcellence",
        reason: "No tags found.",
      }),
    ]);

    const folded = foldDuplicateFinding(
      mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
      report,
    );

    expect(folded).toBe(false);
    expect(report.analysis.reason).toBe("No tags found.");
  });

  it("does not fold an orphan row onto another static-report finding", () => {
    const report = mkReport([
      mkFinding({ recommendationId: "azqr.other", source: "azqr" }),
    ]);

    expect(
      foldDuplicateFinding(
        mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
        report,
      ),
    ).toBe(false);
  });

  it("does not annotate same-source duplicates", () => {
    const report = mkReport([
      mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
    ]);

    foldDuplicateFinding(
      mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
      report,
    );

    expect(report.findings?.[0].reason).toBe("Disk is unattached.");
    expect(report.analysis.reason).toBe("Disk is unattached.");
  });

  it("does not annotate the same corroboration twice", () => {
    const report = mkReport([mkFinding()]);
    const azqrRow = () =>
      mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" });

    foldDuplicateFinding(azqrRow(), report);
    const foldedAgain = foldDuplicateFinding(azqrRow(), report);

    expect(foldedAgain).toBe(true);
    expect(report.findings).toHaveLength(1);
    expect(report.findings?.[0].reason).toBe(
      "Disk is unattached. Also flagged by azqr as an orphaned resource.",
    );
    expect(report.analysis.reason).toBe(
      "Disk is unattached. Also flagged by azqr as an orphaned resource.",
    );
  });

  it("leaves reports without collected findings untouched", () => {
    const report = mkReport([]);
    delete report.findings;

    expect(
      foldDuplicateFinding(
        mkFinding({ recommendationId: ORPHAN_DISK, source: "azqr" }),
        report,
      ),
    ).toBe(false);
  });

  // Custom analyzer sentences with a known template carry a stable
  // recommendationId too (see finding-code.ts), so two custom findings for
  // the same problem must collapse just like a custom/advisor pair does.
  it("folds two custom findings sharing a stable recommendation id", () => {
    const report = mkReport([
      mkFinding({
        code: "custom.disk.unattached",
        recommendationId: "custom.disk.unattached",
      }),
    ]);

    const folded = foldDuplicateFinding(
      mkFinding({
        code: "custom.disk.unattached",
        recommendationId: "custom.disk.unattached",
      }),
      report,
    );

    expect(folded).toBe(true);
    expect(report.findings).toHaveLength(1);
    // Same-source fold: no corroboration note is appended.
    expect(report.findings?.[0].reason).toBe("Disk is unattached.");
  });
});
