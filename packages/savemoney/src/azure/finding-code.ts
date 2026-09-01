/**
 * Stable per-sentence identity for custom (live-scan) analyzer findings.
 *
 * `Finding.recommendationId` powers cross-source dedup, but custom analyzer
 * sentences were deliberately excluded from it: every sentence produced by
 * `findingsFromAnalysisResult` shared the generic `code: "custom.unknown"`
 * and had no stable identifier, so two different sentences could never be
 * told apart safely.
 *
 * This module closes that gap for the sentences whose wording is known ahead
 * of time: each per-resource analyzer in `azure/resources/` builds its
 * `reason` string from a fixed set of templates (e.g. "Disk is unattached.",
 * "VM is deallocated."). This module recognises those templates by a
 * case-insensitive prefix match on the (already sentence-split) `reason` and
 * assigns both `code` and `recommendationId` to a stable `custom.<id>` value,
 * following the same convention as `advisor.<recommendationTypeId>` /
 * `azqr.<recommendationId>`. That is what lets `foldDuplicateFinding`
 * (`finding-dedup.ts`) — whose matching is already identity-based and
 * source-agnostic — collapse two custom findings that describe the same
 * problem on the same resource.
 *
 * A handful of sentences are worded identically by more than one resource
 * type (e.g. App Service Plan and Container App both emit "Very low CPU usage
 * (…)."). Those intentionally share one generic code: dedup only ever
 * compares findings within the same `resourceId`, and a resource can't be two
 * types at once, so the shared code cannot cause a false merge across
 * unrelated resources.
 *
 * Sentences that don't match any known template are left untouched — they
 * keep `code: "custom.unknown"` and no `recommendationId`, exactly like
 * before, so genuinely unrecognised text is never merged on a guess.
 */

import type { Finding } from "../finding.js";

import {
  DETAIL_LOOKUP_FAILURE_PREFIX,
  MISSING_TAGS_REASON,
  NO_ANALYZER_REASON,
  UNPREFERRED_LOCATION_REASON,
} from "./finding-category.js";

/** Shared prefix for every stable custom finding id, mirroring `advisor.<id>` / `azqr.<id>`. */
const CODE_PREFIX = "custom.";

/**
 * Ordered `(normalized reason prefix, code suffix)` pairs. Evaluated
 * top-to-bottom; the first match wins. Prefixes are matched against the
 * trimmed, lower-cased `reason`, so the dynamic suffixes analyzers append
 * (percentages, byte counts, durations, …) never break the match.
 */
const REASON_CODES: readonly (readonly [string, string])[] = [
  // Generic — emitted by (almost) every per-resource analyzer.
  ["resource id is missing.", "missing-resource-id"],
  [DETAIL_LOOKUP_FAILURE_PREFIX, "lookup-failed"],
  [MISSING_TAGS_REASON.toLowerCase(), "missing-tags"],
  [NO_ANALYZER_REASON.toLowerCase(), "no-analyzer"],
  [UNPREFERRED_LOCATION_REASON.toLowerCase(), "unpreferred-location"],

  // Managed Disk (azure/resources/disk.ts)
  ["disk is unattached.", "disk.unattached"],

  // Network Interface (azure/resources/nic.ts)
  ["nic not attached to any vm or private endpoint.", "nic.unattached"],
  ["no public ip assigned.", "nic.no-public-ip"],

  // Private Endpoint (azure/resources/private-endpoint.ts)
  [
    "private endpoint has no private link service connections configured.",
    "private-endpoint.no-connections",
  ],
  [
    "private endpoint has rejected or disconnected connections.",
    "private-endpoint.rejected-connection",
  ],
  [
    "private endpoint has no network interfaces attached.",
    "private-endpoint.no-nics",
  ],
  [
    "private endpoint is not associated with a subnet.",
    "private-endpoint.no-subnet",
  ],

  // Container App (azure/resources/container-app.ts)
  ["container app is not running.", "container-app.not-running"],
  ["container app has 0 replicas configured.", "container-app.zero-replicas"],

  // App Service Plan (azure/resources/app-service.ts)
  ["app service plan has no apps deployed.", "app-service.no-apps"],
  [
    "premium tier with low resource utilization.",
    "app-service.premium-underutilized",
  ],

  // Public IP (azure/resources/public-ip.ts)
  ["public ip not associated with any resource.", "public-ip.unassociated"],
  ["static ip not in use.", "public-ip.static-unused"],

  // Storage Account (azure/resources/storage.ts)
  ["very low transaction count (", "storage.low-transactions"],

  // Virtual Machine (azure/resources/vm.ts) — worded distinctly ("Low ...",
  // no "Very") from the shared "Very low ..." family below.
  ["vm is deallocated.", "vm.deallocated"],
  ["vm is stopped.", "vm.stopped"],
  ["low cpu usage (avg", "vm.low-cpu-usage"],
  ["low network traffic (", "vm.low-network-traffic"],

  // Static Web App (azure/resources/static-web-app.ts)
  ["no traffic data available in", "static-site.no-traffic-data"],
  ["very low site traffic (", "static-site.low-traffic"],
  ["very low data transfer (", "static-site.low-data-transfer"],

  // Shared across resource types whose analyzers phrase the same signal with
  // identical text — see module doc. App Service Plan + Container App for
  // CPU/memory; Container App + Public IP for network traffic.
  ["very low cpu usage (", "low-cpu-usage"],
  ["very low memory usage (", "low-memory-usage"],
  ["very low network traffic (", "low-network-traffic"],
];

/**
 * Assigns a stable `code`/`recommendationId` to every custom finding whose
 * `reason` matches a known sentence template, so equivalent sentences about
 * the same resource collapse via `foldDuplicateFinding` instead of appearing
 * as separate rows.
 *
 * Leaves untouched: non-`"custom"` findings, and findings that already carry
 * a `recommendationId` (nothing to add) or whose `reason` matches no known
 * template (stays `"custom.unknown"`, ungrouped — the same fallback behaviour
 * as before this module existed).
 */
export function assignCustomFindingCodes(findings: Finding[]): Finding[] {
  return findings.map((finding) => {
    if (finding.source !== "custom" || finding.recommendationId) {
      return finding;
    }
    const code = stableCodeFor(finding.reason);
    return code ? { ...finding, code, recommendationId: code } : finding;
  });
}

function stableCodeFor(reason: string): string | undefined {
  const normalized = reason.trim().toLowerCase();
  const match = REASON_CODES.find(([prefix]) => normalized.startsWith(prefix));
  return match ? `${CODE_PREFIX}${match[1]}` : undefined;
}
