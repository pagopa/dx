/**
 * Azure Advisor analyzer.
 *
 * Fetches all `Cost` recommendations for the target subscription via the
 * `@azure/arm-advisor` SDK and normalises them into the unified `Finding`
 * model.
 *
 * ## Two kinds of Advisor cost recommendations
 *
 * ### Resource-specific (resourceMetadata.resourceId contains /providers/)
 * Recommendations about a particular Azure resource (e.g. "right-size this
 * VM"). Each is emitted as a separate Finding so it appears next to the
 * resource in the per-resource section of the report. `enrichReason` adds
 * SKU / region / term context from `extendedProperties` so findings for
 * the same recommendation type on different resources are distinguishable.
 *
 * ### Subscription-scoped (no resourceId, or resourceId without /providers/)
 * Reserved Instance and Savings Plan recommendations. The Advisor API
 * returns **one entry per qualifying combination** (term, scope, quantity,
 * etc.) but the Azure Portal **groups them by `recommendationTypeId`** and
 * shows a single entry for the best option — matching the mental model
 * a user has when deciding whether to buy a commitment.
 *
 * Different amounts within the same `recommendationTypeId` represent
 * **mutually exclusive purchase options** (e.g. different DB sizes or
 * quantities); the user would choose one, not buy all. We therefore report
 * the **maximum** savings amount across all unique configurations, matching
 * the portal's behaviour. Scope variants (Shared / Single / ResourceGroup)
 * that carry the same amount are deduplicated so they do not count more
 * than once. True duplicates — recommendations with the same ARM ID —
 * are also removed before taking the maximum.
 */

import { AdvisorManagementClient } from "@azure/arm-advisor";
import { getLogger } from "@logtape/logtape";

import type { Finding } from "../../finding.js";
import type { CostRisk } from "../../types.js";
import type {
  SubscriptionAnalyzer,
  SubscriptionContext,
} from "./subscription.js";

/** Minimal client shape used by the analyzer (and injectable in tests). */
type AdvisorClientLike = {
  recommendations: {
    list(options?: { filter?: string }): AsyncIterable<RecommendationInfo>;
  };
};

/** Minimal shape of a recommendation entry needed by the helpers. */
type RecommendationInfo = {
  category?: string;
  extendedProperties?: Record<string, unknown>;
  id?: string;
  impact?: string;
  recommendationTypeId?: string;
  resourceMetadata?: { resourceId?: string };
  shortDescription?: { problem?: string; solution?: string };
};

/** Accumulator for subscription-scoped recommendations grouped by type. */
type SubGroup = {
  /** Best (maximum) monthly savings among all deduplicated options in this group. */
  bestAmount: number;
  /** Number of distinct savings configurations aggregated (unique amounts). */
  count: number;
  /** ISO 4217 currency code of the first recommendation in this group. */
  currency: string;
  /** Prototype Finding shared by all recommendations in this group. */
  proto: Omit<Finding, "estimatedMonthlySavings">;
  /** ARM IDs of recommendations already counted — deduplicates true API duplicates. */
  recIds: Set<string>;
  /**
   * `"${amount}"` keys for already-seen savings — deduplicates scope variants.
   * Advisor returns the same configuration for Shared, Single, and ResourceGroup
   * scopes all with the same savings amount; we track each amount only once so
   * we can take the max without double-counting identical scope variants.
   */
  uniqueSavingsKeys: Set<string>;
};

/**
 * Builds the Advisor subscription-level analyzer.
 *
 * @param clientFactory  Optional override to inject a mock client in tests.
 *                       In production the default factory builds a real
 *                       `AdvisorManagementClient` from the credential.
 */
export function createAdvisorAnalyzer(clientFactory?: {
  build(
    credential: SubscriptionContext["credential"],
    subscriptionId: string,
  ): AdvisorClientLike;
}): SubscriptionAnalyzer {
  const build =
    clientFactory?.build ??
    ((credential, subscriptionId) =>
      new AdvisorManagementClient(credential, subscriptionId));

  return {
    async analyze(ctx: SubscriptionContext): Promise<Finding[]> {
      const logger = getLogger(["savemoney", "azure", "advisor"]);
      const client = build(ctx.credential, ctx.subscriptionId);
      const resourceFindings: Finding[] = [];
      const subGroups = new Map<string, SubGroup>();

      for await (const rec of client.recommendations.list({
        filter: "Category eq 'Cost'",
      })) {
        if (rec.category?.toLowerCase() !== "cost") continue;
        const rawResourceId = rec.resourceMetadata?.resourceId;
        const props = rec.extendedProperties as
          | Record<string, string>
          | undefined;
        const savings = parseSavings(props);
        if (rawResourceId && /\/providers\//i.test(rawResourceId)) {
          resourceFindings.push(
            buildResourceFinding(rec, savings, props, rawResourceId),
          );
        } else {
          addToSubGroups(subGroups, rec, savings, ctx, logger);
        }
      }

      const findings = [...resourceFindings, ...flushSubGroups(subGroups)];
      logger.info(
        `Advisor: ${findings.length} cost finding(s) for ${ctx.subscriptionId}` +
          ` (${resourceFindings.length} resource-specific, ${subGroups.size} subscription-level)`,
      );
      return findings;
    },
    id: "azure.advisor",
  };
}

// ── helpers — extracted to keep `analyze` complexity within linter limits —

function addToSubGroups(
  subGroups: Map<string, SubGroup>,
  rec: RecommendationInfo,
  savings: undefined | { amount: number; currency: string },
  ctx: SubscriptionContext,
  logger: ReturnType<typeof getLogger>,
): void {
  const typeKey =
    rec.recommendationTypeId ??
    `unknown.${rec.shortDescription?.problem ?? ""}`;
  const existing = subGroups.get(typeKey);
  if (existing) {
    updateSubGroup(existing, rec.id ?? "", savings);
  } else {
    subGroups.set(typeKey, createSubGroup(rec, typeKey, savings, ctx, logger));
  }
}

function buildResourceFinding(
  rec: RecommendationInfo,
  savings: undefined | { amount: number; currency: string },
  props: Record<string, string> | undefined,
  rawResourceId: string,
): Finding {
  const problem =
    rec.shortDescription?.problem ??
    rec.shortDescription?.solution ??
    "Azure Advisor cost recommendation";
  return {
    category: "cost",
    code: `advisor.${rec.recommendationTypeId ?? "unknown"}`,
    estimatedMonthlySavings: savings,
    reason: enrichReason(problem, props),
    recommendedAction: rec.shortDescription?.solution,
    resourceId: rawResourceId,
    severity: mapImpact(rec.impact),
    source: "advisor",
  };
}

function createSubGroup(
  rec: RecommendationInfo,
  typeKey: string,
  savings: undefined | { amount: number; currency: string },
  ctx: SubscriptionContext,
  logger: ReturnType<typeof getLogger>,
): SubGroup {
  const problem =
    rec.shortDescription?.problem ??
    rec.shortDescription?.solution ??
    "Azure Advisor cost recommendation";
  const reason = problem.endsWith(".") ? problem : `${problem}.`;
  const rawResourceId = rec.resourceMetadata?.resourceId;
  const resourceId = rawResourceId ?? `/subscriptions/${ctx.subscriptionId}`;
  if (!rawResourceId && ctx.verbose) {
    logger.debug(
      `Advisor recommendation has no resourceId, attributed to subscription: ${typeKey}`,
    );
  }
  return {
    bestAmount: savings?.amount ?? 0,
    count: savings ? 1 : 0,
    currency: savings?.currency ?? "USD",
    proto: {
      category: "cost",
      code: `advisor.${typeKey}`,
      reason,
      recommendedAction: rec.shortDescription?.solution,
      resourceId,
      severity: mapImpact(rec.impact),
      source: "advisor",
    },
    recIds: new Set(rec.id ? [rec.id] : []),
    uniqueSavingsKeys: new Set(savings ? [`${savings.amount}`] : []),
  };
}

/**
 * Appends discriminating context (SKU, region, term, scope, …) to the
 * Advisor short description so visually-duplicated reasons can be told
 * apart. RI / Savings Plan recommendations in particular return the same
 * `problem` string for every SKU+region+term combination, which made the
 * report look like it carried duplicated rows. Each call stays a single
 * Finding — we do NOT deduplicate, because every recommendation refers
 * to a different commitment with its own savings figure.
 */
function enrichReason(
  problem: string,
  props: Record<string, string> | undefined,
): string {
  const base = problem.endsWith(".") ? problem : `${problem}.`;
  if (!props) return base;
  const parts: string[] = [];
  // armSkuName covers VM RIs; productName/serviceType cover SQL/Cosmos/etc.
  const sku =
    props.armSkuName ?? props.productName ?? props.serviceType ?? props.sku;
  if (sku) parts.push(sku);
  const region = props.region ?? props.location;
  if (region) parts.push(region);
  // Normalise term values (P1Y / P3Y / 1_Year / 3_Year) into a compact label.
  const rawTerm = props.term;
  if (rawTerm) {
    const term = /3/.test(rawTerm) ? "3y" : /1/.test(rawTerm) ? "1y" : rawTerm;
    parts.push(term);
  }
  const scope = props.scope;
  if (scope) parts.push(scope.toLowerCase());
  const qty = props.displayQuantity ?? props.quantity;
  if (qty) parts.push(`x${qty}`);
  if (parts.length === 0) return base;
  return `${base} (${parts.join(", ")})`;
}

function flushSubGroups(subGroups: Map<string, SubGroup>): Finding[] {
  const findings: Finding[] = [];
  for (const { bestAmount, count, currency, proto } of subGroups.values()) {
    const estimatedMonthlySavings =
      bestAmount > 0 ? { amount: bestAmount, currency } : undefined;
    const reason =
      count > 1
        ? proto.reason.replace(/\.$/, ` (${count} options).`)
        : proto.reason;
    findings.push({ ...proto, estimatedMonthlySavings, reason });
  }
  return findings;
}

/**
 * Maps Advisor's `impact` (`High` | `Medium` | `Low`) onto the savemoney
 * `CostRisk` scale. Falls back to `low` for any unexpected value to keep
 * the analyzer resilient to future Advisor enum extensions.
 */
function mapImpact(impact: string | undefined): CostRisk {
  switch (impact?.toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

/**
 * Parses the savings amount from Advisor's `extendedProperties`. Advisor
 * returns it as a string; treat anything non-numeric as "no estimate".
 */
function parseSavings(
  extendedProperties: Record<string, string> | undefined,
): undefined | { amount: number; currency: string } {
  if (!extendedProperties) return undefined;
  const raw = extendedProperties.savingsAmount ?? extendedProperties.savings;
  if (!raw) return undefined;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return undefined;
  const currency =
    extendedProperties.savingsCurrency ?? extendedProperties.currency ?? "USD";
  return { amount, currency };
}

function updateSubGroup(
  group: SubGroup,
  recId: string,
  savings: undefined | { amount: number; currency: string },
): void {
  if (recId && group.recIds.has(recId)) return; // true API duplicate
  if (recId) group.recIds.add(recId);
  if (!savings) return;
  // Bootstrap currency from the first recommendation that carries savings.
  // createSubGroup() defaults currency to "USD" when the first entry has no
  // savings; without this check, later entries with a different currency (e.g.
  // "EUR") would be silently dropped and no savings would ever be surfaced.
  if (group.count === 0) {
    group.currency = savings.currency;
    group.uniqueSavingsKeys.add(`${savings.amount}`);
    group.bestAmount = savings.amount;
    group.count = 1;
    return;
  }
  if (savings.currency !== group.currency) return;
  const key = `${savings.amount}`;
  if (group.uniqueSavingsKeys.has(key)) return; // scope variant, already seen
  group.uniqueSavingsKeys.add(key);
  group.bestAmount = Math.max(group.bestAmount, savings.amount);
  group.count++;
}
