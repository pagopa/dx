/**
 * Cross-source deduplication of findings.
 *
 * SaveMoney observes the same subscription through three lenses: the custom
 * live-scan analyzers, Azure Advisor, and an optional AZQR report. They
 * overlap — an unattached disk is waste no matter who reports it — so the
 * same resource could otherwise appear several times in the output, once per
 * source. This also folds duplicate sentences emitted by the custom analyzers
 * themselves (e.g. the same resource triggering the same "Very low CPU usage"
 * template twice), since the matching below is source-agnostic.
 *
 * Findings are unified on the `resourceId + recommendationId` key. Sources
 * normalise `recommendationId` onto a shared vocabulary whenever one exists:
 * orphaned resources use {@link orphanRecommendationId} regardless of who
 * detected them, which is what lets an AZQR `AOR` row collapse onto the
 * Advisor or custom finding for the same resource. Custom analyzer sentences
 * with a known template get a stable `custom.<id>` identity from
 * `finding-code.ts`; sentences with no known template keep
 * `code: "custom.unknown"` and no `recommendationId`, so they are never
 * collapsed on guesswork. The surviving finding is the one carrying the
 * monetary estimate (only Advisor and the pricing-enriched custom analyzers
 * have one — AZQR reports no amounts at all), annotated with the
 * corroborating source so the extra provenance is not lost.
 */

import type { Finding, FindingSource } from "../finding.js";
import type { AzureDetailedResourceReport } from "./types.js";

import { maxCostRisk } from "../types.js";

/** Sources that observe the live subscription, as opposed to a static report. */
const LIVE_SOURCES: ReadonlySet<FindingSource> = new Set(["advisor", "custom"]);

/**
 * Canonical identity prefix for "this resource is provisioned but unused".
 * Shared by every source so orphan findings deduplicate across them.
 */
const ORPHAN_RECOMMENDATION_PREFIX = "orphan.";

/**
 * Folds `incoming` into an existing finding of `report` when both describe the
 * same problem, so the resource is reported once instead of once per source.
 *
 * The surviving finding keeps the highest severity and the only available
 * monetary estimate, and records the corroborating source both in its own
 * reason and in the legacy per-resource `analysis` summary, so the `lint`,
 * `json` and `table` formats all keep the provenance.
 *
 * @returns `true` when the finding was folded and must not be appended.
 */
export function foldDuplicateFinding(
  incoming: Finding,
  report: AzureDetailedResourceReport,
): boolean {
  const findings = report.findings;
  if (!findings) {
    return false;
  }
  const surviving = findDuplicateFinding(incoming, findings);
  if (!surviving) {
    return false;
  }
  const note = corroborationNote(surviving, incoming);
  findings[findings.indexOf(surviving)] = {
    ...surviving,
    estimatedMonthlySavings:
      surviving.estimatedMonthlySavings ?? incoming.estimatedMonthlySavings,
    reason: note ? `${surviving.reason.trimEnd()} ${note}` : surviving.reason,
    recommendationId: surviving.recommendationId ?? incoming.recommendationId,
    severity: maxCostRisk(surviving.severity, incoming.severity),
  };
  report.analysis = {
    ...report.analysis,
    costRisk: maxCostRisk(report.analysis.costRisk, incoming.severity),
    reason: note
      ? `${report.analysis.reason.trimEnd()} ${note}`.trim()
      : report.analysis.reason,
  };
  return true;
}

/**
 * Builds the canonical identity of an orphaned resource of the given type,
 * e.g. `orphan.microsoft.compute/disks`.
 */
export function orphanRecommendationId(resourceType: string): string {
  return `${ORPHAN_RECOMMENDATION_PREFIX}${resourceType.toLowerCase()}`;
}

/**
 * Short sentence appended to the surviving finding so the reader still sees
 * that a second source flagged the same resource. Omitted for same-source
 * duplicates, where there is no extra provenance to record, and when the same
 * note is already there — repeated rows must corroborate, not accumulate.
 */
function corroborationNote(
  surviving: Finding,
  incoming: Finding,
): string | undefined {
  if (surviving.source === incoming.source) {
    return undefined;
  }
  const note = isOrphanRecommendation(incoming.recommendationId)
    ? `Also flagged by ${incoming.source} as an orphaned resource.`
    : `Also flagged by ${incoming.source}.`;
  return surviving.reason.includes(note) ? undefined : note;
}

/**
 * Returns the already-collected finding that covers the same problem as
 * `incoming`, or `undefined` when the incoming finding is genuinely new.
 *
 * Two findings describe the same problem when either:
 *
 * 1. they share the exact canonical identity (`recommendationId`) on the same
 *    resource — a true duplicate, e.g. the same AZQR row ingested twice; or
 * 2. `incoming` reports the resource as orphaned and a live source already
 *    reported billable waste on it with no stronger identity of its own (e.g.
 *    a sentence-level custom finding with no `recommendationId`). An orphaned
 *    resource has a single cost problem — it exists — so the live finding,
 *    which can carry a monetary estimate, supersedes the static one. A live
 *    finding that already carries its own distinct `recommendationId` (e.g.
 *    an Advisor right-sizing recommendation) is a different problem and is
 *    never absorbed this way.
 *
 * Findings without a `recommendationId` never match: sentences whose text
 * matches no known template (still `code: "custom.unknown"`, see
 * `finding-code.ts`) must not be collapsed on guesswork.
 */
function findDuplicateFinding(
  incoming: Finding,
  existing: readonly Finding[],
): Finding | undefined {
  const identity = incoming.recommendationId?.toLowerCase();
  if (!identity) {
    return undefined;
  }
  const sameIdentity = existing.find(
    (candidate) => candidate.recommendationId?.toLowerCase() === identity,
  );
  if (sameIdentity) {
    return sameIdentity;
  }
  if (!isOrphanRecommendation(incoming.recommendationId)) {
    return undefined;
  }
  return existing.find(
    (candidate) =>
      candidate.category === "cost" &&
      LIVE_SOURCES.has(candidate.source) &&
      !candidate.recommendationId,
  );
}

function isOrphanRecommendation(recommendationId: string | undefined): boolean {
  return (recommendationId ?? "").startsWith(ORPHAN_RECOMMENDATION_PREFIX);
}
