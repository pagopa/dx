/**
 * Unified Finding model — the single representation of a cost-related
 * observation, regardless of its source (custom analyzers, Azure Advisor,
 * future AWS Trusted Advisor, …).
 *
 * Introduced in Phase 0 of the savemoney evolution roadmap. Existing
 * `AnalysisResult`-based analyzers keep working untouched: an adapter
 * (`findingsFromAnalysisResult`) splits the concatenated `reason` string
 * into one `Finding` per sentence, so downstream consumers can already
 * reason in terms of `Finding[]`.
 */

import type { CostRisk } from "./types.js";

/**
 * A single, atomic observation about a resource.
 *
 * One resource can produce multiple findings (e.g. "no tags" + "low CPU").
 * Findings are designed to be deduplicated by `(resourceId, source, code)`.
 */
export type Finding = {
  /**
   * Cloud category. Today every custom finding is "cost"; Advisor may
   * surface other categories that we currently ignore.
   */
  category: FindingCategory;
  /**
   * Stable machine-readable identifier for the kind of finding, e.g.
   * `vm.deallocated`, `disk.unattached`, `advisor.right-size-vm`.
   * Used for deduplication and grouping. Free-form for now to keep the
   * adapter from existing analyzers cheap; can be tightened later.
   */
  code: string;
  /**
   * Estimated monthly cost that could be recovered by acting on this
   * finding. Populated by Advisor and (in later phases) by the Retail
   * Prices integration. Absent when the analyzer cannot estimate it.
   */
  estimatedMonthlySavings?: Money;
  /**
   * Free-text, human-readable description. Backward compatible with the
   * legacy `AnalysisResult.reason` field.
   */
  reason: string;
  /**
   * Optional, machine-friendly hint about how to remediate. For Advisor
   * this typically maps to `shortDescription.solution`.
   */
  recommendedAction?: string;
  /**
   * Fully qualified Azure / cloud resource ID this finding refers to.
   */
  resourceId: string;
  /**
   * Cost risk classification. Maps Advisor's `impact` (High/Medium/Low)
   * 1:1 onto the savemoney scale.
   */
  severity: CostRisk;
  /**
   * Provenance of the finding.
   */
  source: FindingSource;
};

/**
 * Cloud category a finding belongs to. For now we focus on cost, but the
 * model is open to future Advisor categories.
 */
export type FindingCategory =
  | "cost"
  | "operationalExcellence"
  | "performance"
  | "reliability"
  | "security";

/**
 * Where the finding originated from.
 *
 * - `custom`  → emitted by a savemoney analyzer plugin
 * - `advisor` → fetched from Azure Advisor recommendations
 * - `aws`     → reserved for future AWS Trusted Advisor / Compute Optimizer
 */
export type FindingSource = "advisor" | "aws" | "custom";

/**
 * Monetary value associated with a finding, when known.
 * Amounts use ISO 4217 currency codes (e.g. "EUR", "USD").
 */
export type Money = {
  amount: number;
  currency: string;
};

/**
 * Aggregate view: one resource with the list of findings emitted for it.
 *
 * This is the type future report generators should consume. The current
 * report layer still works on `AzureDetailedResourceReport`; a helper
 * (`legacyReportFromResourceReport`) bridges the two until the report
 * layer is migrated.
 */
export type ResourceReport<TResource = unknown> = {
  findings: Finding[];
  resource: TResource;
};

/**
 * Adapter: converts a legacy `AnalysisResult` (single concatenated
 * reason) into a list of `Finding`s, one per sentence.
 *
 * @param resourceId      Fully qualified resource ID
 * @param severity        Cost risk classification produced by the analyzer
 * @param reason          Concatenated reason string (sentences joined by ". ")
 * @param source          Provenance (default: "custom")
 * @param code            Optional stable identifier for the finding kind
 *                        (e.g. `"vm.deallocated"`). Defaults to
 *                        `"custom.unknown"` when omitted.
 */
export function findingsFromAnalysisResult(args: {
  code?: string;
  reason: string;
  resourceId: string;
  severity: CostRisk;
  source?: FindingSource;
}): Finding[] {
  const { code, reason, resourceId, severity, source = "custom" } = args;
  const sentences = splitReasonIntoSentences(reason);
  if (sentences.length === 0) {
    return [];
  }
  return sentences.map((sentence) => ({
    category: "cost" as const,
    code: code ?? "custom.unknown",
    reason: sentence,
    resourceId,
    severity,
    source,
  }));
}

/**
 * Splits a concatenated reason string (sentences joined by ". ") into
 * individual non-empty sentences. Mirrors the logic already used by the
 * lint reporter so behaviour stays consistent.
 */
function splitReasonIntoSentences(reason: string): string[] {
  return reason
    .split(/\.\s+|\.$/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(".") ? s : `${s}.`));
}
