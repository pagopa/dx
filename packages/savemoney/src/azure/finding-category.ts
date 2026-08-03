/**
 * Categorisation of the reasons emitted by the custom (live-scan) Azure
 * analyzers.
 *
 * The per-resource analyzers describe everything they observe in a single
 * concatenated `reason` string, which `findingsFromAnalysisResult` then splits
 * into one `Finding` per sentence. Historically every sentence was labelled
 * `category: "cost"`, including governance and diagnostic observations such as
 * missing tags or a failed detail lookup — statements that carry no billable
 * waste and would suggest a "saving" that does not exist.
 *
 * This module separates the two: governance / diagnostic sentences are reported
 * as `operationalExcellence`, leaving `cost` to mean "actual billable waste".
 * The distinction is also what makes cross-source deduplication safe (see
 * `finding-dedup.ts`): a resource flagged only for missing tags is not evidence
 * that it is wasted, so it must not absorb the corresponding AZQR orphan row.
 *
 * The generic reason strings are defined here and consumed by `analyzer.ts`, so
 * the classifier cannot drift from the text it has to recognise.
 */

import type { Finding, FindingCategory } from "../finding.js";

/** Reason emitted when a resource carries no tags at all. */
export const MISSING_TAGS_REASON = "No tags found.";

/** Reason emitted when no analyzer plugin supports the resource type. */
export const NO_ANALYZER_REASON =
  "No specific analysis for this resource type.";

/**
 * Prefix of the diagnostic sentences emitted by the per-resource analyzers when
 * an Azure detail lookup fails (e.g. "Could not retrieve detailed NIC
 * information."). They report a gap in the scan, not a cost opportunity.
 */
const DETAIL_LOOKUP_FAILURE_PREFIX = "could not retrieve detailed";

/** Prefix of the reason emitted when a resource sits outside the target region. */
const UNPREFERRED_LOCATION_REASON = "Resource not in preferred location";

/**
 * Re-categorises the findings produced from a custom analyzer's `reason`
 * string, so governance and diagnostic sentences stop being reported as cost
 * opportunities.
 */
export function categorizeCustomFindings(findings: Finding[]): Finding[] {
  return findings.map((finding) => ({
    ...finding,
    category: categorizeCustomReason(finding.reason),
  }));
}

/** Builds the reason emitted when a resource sits outside the target region. */
export function unpreferredLocationReason(preferredLocation: string): string {
  return `${UNPREFERRED_LOCATION_REASON} (${preferredLocation}).`;
}

/**
 * Classifies a single custom analyzer sentence.
 *
 * @returns `"operationalExcellence"` for governance / diagnostic statements,
 *          `"cost"` for everything else (the analyzers' actual waste signals).
 */
function categorizeCustomReason(reason: string): FindingCategory {
  const normalized = reason.trim().toLowerCase();
  const isNonCost =
    normalized.startsWith(MISSING_TAGS_REASON.toLowerCase()) ||
    normalized.startsWith(NO_ANALYZER_REASON.toLowerCase()) ||
    normalized.startsWith(UNPREFERRED_LOCATION_REASON.toLowerCase()) ||
    normalized.startsWith(DETAIL_LOOKUP_FAILURE_PREFIX);
  return isNonCost ? "operationalExcellence" : "cost";
}
