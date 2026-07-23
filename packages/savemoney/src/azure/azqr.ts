/**
 * AZQR report ingestion.
 *
 * Parses an AZQR (`azqr scan --json`) report and turns its `impacted`
 * resources into the unified `Finding` model (`source: "azqr"`), keeping only
 * the rows that carry FinOps signal so the SaveMoney output is not flooded with
 * security / reliability / high-availability best-practice noise. Promoted rows
 * fall into two classes (see {@link classifyAzqrRow}):
 *
 * - **cost** (`category: "cost"`): billable waste — rows AZQR categorises as
 *   `Cost`, or orphaned resources whose type actually incurs cost (public IPs,
 *   NAT gateways, application gateways, …).
 * - **cleanup** (`category: "operationalExcellence"`): orphaned *free* resources
 *   (empty subnets, unattached NSGs, orphan API connections, …). They carry no
 *   direct cost but are cleanup candidates worth investigating.
 *
 * Orphans are detected via AZQR's `AOR` (Azure Orphan Resources) check source
 * rather than fragile recommendation-text matching.
 *
 * The AZQR CLI masks subscription IDs by default (e.g.
 * `/subscriptions/xxxxxxxx-…/`). Masked IDs do not match the real resource IDs
 * produced by a live scan, so masked findings cannot be merged onto their
 * resources — {@link isAzqrReportMasked} lets the orchestrator warn and advise
 * re-running with `azqr scan --mask=false`.
 *
 * Scope note (CES-2192 / Fase 1): only `impacted` rows are ingested, enriched
 * with `inventory` metadata when available. AZQR `advisor` rows are ignored to
 * avoid duplicating SaveMoney's own Azure Advisor cost query.
 */

import { readFile } from "node:fs/promises";
import { z } from "zod";

import type { CostRisk } from "../types.js";

import { type Finding } from "../finding.js";

/** A single `impacted` row from an AZQR JSON report (fields we consume). */
const azqrImpactedRowSchema = z.object({
  category: z.string().optional(),
  impact: z.string().optional(),
  learn: z.string().optional(),
  recommendation: z.string(),
  recommendationId: z.string().optional(),
  resourceGroup: z.string().optional(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  resourceType: z.string().optional(),
  source: z.string().optional(),
  subscriptionId: z.string().optional(),
  subscriptionName: z.string().optional(),
});

/** A single `inventory` row from an AZQR JSON report (used for enrichment). */
const azqrInventoryRowSchema = z.object({
  location: z.string().optional(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  resourceType: z.string().optional(),
  skuName: z.string().optional(),
  skuTier: z.string().optional(),
  subscriptionId: z.string().optional(),
});

/**
 * Lenient top-level schema. AZQR reports carry many sections we do not use
 * (`advisor`, `defender`, `recommendations`, …); unknown keys are stripped and
 * missing arrays default to empty so a partial/older report still parses.
 */
const azqrReportSchema = z.object({
  impacted: z.array(azqrImpactedRowSchema).default([]),
  inventory: z.array(azqrInventoryRowSchema).default([]),
});

export type AzqrImpactedRow = z.infer<typeof azqrImpactedRowSchema>;
export type AzqrInventoryRow = z.infer<typeof azqrInventoryRowSchema>;
export type AzqrReport = z.infer<typeof azqrReportSchema>;

/**
 * Azure resource types whose orphaned/unassociated instances actually incur
 * cost. AZQR's `AOR` (Azure Orphan Resources) check mixes these billable
 * resources with free config-hygiene ones (NSGs, subnets, orphan API
 * connections, private endpoints, …): the former are classified as `cost`
 * opportunities, the latter as `cleanup` candidates.
 */
const BILLABLE_ORPHAN_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "microsoft.compute/disks",
  "microsoft.compute/snapshots",
  "microsoft.network/applicationgateways",
  "microsoft.network/ddosprotectionplans",
  "microsoft.network/frontdoorwebapplicationfirewallpolicies",
  "microsoft.network/loadbalancers",
  "microsoft.network/natgateways",
  "microsoft.network/publicipaddresses",
  "microsoft.network/virtualnetworkgateways",
  "microsoft.sql/servers/elasticpools",
  "microsoft.web/serverfarms",
]);

/**
 * AZQR's check source for orphaned resources (the Azure Orphan Resources
 * project). Every `impacted` row tagged with it is a provisioned-but-unused
 * resource, so it is a reliable, text-independent orphan marker.
 */
const ORPHAN_CHECK_SOURCE = "aor";

/** AZQR masks subscription GUID segments with runs of `x`. */
const MASK_MARKER = "xxxxxxxx";

/** How a promoted AZQR row is classified for reporting. */
export type AzqrOpportunityKind = "cleanup" | "cost";

const COST_REMEDIATION =
  "Review the resource and remove or right-size it if it is no longer needed to stop incurring cost.";

const CLEANUP_REMEDIATION =
  "Orphaned resource with no direct cost. Verify it is unused, then remove it to reduce clutter and management overhead.";

/**
 * Converts the promoted `impacted` rows of an AZQR report into findings.
 * AZQR carries no monetary estimate, so `estimatedMonthlySavings` is left
 * unset. Billable rows render as `cost` opportunities (keeping AZQR's impact as
 * severity); orphaned free resources render as low-severity
 * `operationalExcellence` cleanup candidates. All carry an `[azqr]` badge.
 */
export function azqrImpactedToFindings(report: AzqrReport): Finding[] {
  const inventoryById = new Map(
    report.inventory.map((row) => [row.resourceId.toLowerCase(), row]),
  );
  const findings: Finding[] = [];
  for (const row of report.impacted) {
    const kind = classifyAzqrRow(row);
    if (kind === null) continue;
    const inventory = inventoryById.get(row.resourceId.toLowerCase());
    const cleanup = kind === "cleanup";
    const remediation = cleanup ? CLEANUP_REMEDIATION : COST_REMEDIATION;
    findings.push({
      category: cleanup ? "operationalExcellence" : "cost",
      code: row.recommendationId
        ? `azqr.${row.recommendationId}`
        : "azqr.impacted",
      reason: buildReason(row, inventory),
      recommendedAction: row.learn
        ? `${remediation} Learn more: ${row.learn}`
        : remediation,
      resourceId: row.resourceId,
      severity: cleanup ? "low" : mapAzqrImpact(row.impact),
      source: "azqr",
    });
  }
  return findings;
}

/**
 * Classifies an `impacted` row for FinOps reporting, or returns `null` to drop
 * it as noise.
 *
 * - `"cost"` — AZQR categorises the row as a cost item, or it is an orphaned
 *   resource of a billable type (real savings potential).
 * - `"cleanup"` — an orphaned resource of a *free* type (empty subnets,
 *   unattached NSGs, orphan API connections, …): no direct cost, but a cleanup
 *   candidate worth investigating.
 * - `null` — everything else (security, reliability, high-availability and
 *   other best-practice rows) is treated as noise and dropped.
 *
 * Orphans are identified by AZQR's `AOR` check source, not by matching the
 * recommendation text.
 */
export function classifyAzqrRow(
  row: AzqrImpactedRow,
): AzqrOpportunityKind | null {
  if ((row.category ?? "").toLowerCase().includes("cost")) {
    return "cost";
  }
  if ((row.source ?? "").toLowerCase() !== ORPHAN_CHECK_SOURCE) {
    return null;
  }
  const resourceType = (row.resourceType ?? "").toLowerCase();
  return BILLABLE_ORPHAN_RESOURCE_TYPES.has(resourceType) ? "cost" : "cleanup";
}

/**
 * Detects whether the report still carries AZQR's default subscription-ID
 * masking. Masked resource IDs cannot be matched against a live scan, so the
 * caller should advise re-running with `azqr scan --mask=false`.
 */
export function isAzqrReportMasked(report: AzqrReport): boolean {
  return report.impacted.some(
    (row) =>
      row.resourceId.includes(MASK_MARKER) ||
      (row.subscriptionId?.includes(MASK_MARKER) ?? false),
  );
}

/**
 * Reads and parses an AZQR JSON report from disk.
 *
 * @throws Error when the file cannot be read or is not valid AZQR JSON; the
 *         underlying failure is preserved as `cause`.
 */
export async function loadAzqrReport(filePath: string): Promise<AzqrReport> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Cannot read AZQR report at "${filePath}"`, {
      cause: error,
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new Error(`AZQR report at "${filePath}" is not valid JSON`, {
      cause: error,
    });
  }

  return parseAzqrReport(json);
}

/**
 * Validates and parses an unknown value as an AZQR report.
 *
 * @throws Error (with the zod issue as `cause`) when the shape is invalid.
 */
export function parseAzqrReport(raw: unknown): AzqrReport {
  const result = azqrReportSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid AZQR report: ${result.error.message}`, {
      cause: result.error,
    });
  }
  return result.data;
}

/**
 * Builds the finding reason from the AZQR recommendation, appending SKU / tier
 * / location context from the matching `inventory` row when available.
 */
function buildReason(
  row: AzqrImpactedRow,
  inventory: AzqrInventoryRow | undefined,
): string {
  const base = row.recommendation.trim();
  const sentence = base.endsWith(".") ? base : `${base}.`;
  const context: string[] = [];
  if (inventory?.skuName) context.push(inventory.skuName);
  if (inventory?.skuTier && inventory.skuTier !== inventory.skuName) {
    context.push(inventory.skuTier);
  }
  if (inventory?.location) context.push(inventory.location);
  return context.length > 0 ? `${sentence} (${context.join(", ")})` : sentence;
}

/**
 * Maps AZQR/APRL `impact` (`High` | `Medium` | `Low`) onto the SaveMoney
 * `CostRisk` scale, defaulting to `low` for unknown values.
 */
function mapAzqrImpact(impact: string | undefined): CostRisk {
  switch (impact?.toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}
