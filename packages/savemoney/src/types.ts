/**
 * Common types shared across all cloud providers
 */

import type { Money } from "./finding.js";

import { ThresholdsSchema } from "./schema.js";

export type AnalysisResult = {
  costRisk: CostRisk;
  /**
   * Estimated monthly resource cost at risk. Custom pricing-enriched
   * analyzers populate it when a Retail Prices lookup succeeds; the report
   * renders it once per resource instead of treating it as a per-finding
   * saving.
   */
  estimatedMonthlySavings?: Money;
  reason: string;
  suspectedUnused: boolean;
};

/**
 * Base configuration interface that all cloud providers should extend
 */
export type BaseConfig = {
  preferredLocation: string;
  timespanDays: number;
};

export type CostRisk = "high" | "low" | "medium";

/** Cost risk ordering, from the most to the least severe. */
export const COST_RISK_ORDER: Record<CostRisk, number> = {
  high: 0,
  low: 2,
  medium: 1,
};

/**
 * Configurable thresholds used during resource analysis.
 * Derived from `ThresholdsSchema` — the schema is the single source of truth.
 */
export type { Thresholds } from "./schema.js";

/**
 * Default threshold values — produced by parsing an empty object through
 * `ThresholdsSchema`, which applies all schema-defined defaults.
 */
export const DEFAULT_THRESHOLDS = ThresholdsSchema.parse({});

/**
 * Returns the more severe of two cost risks. Used whenever two observations
 * about the same resource (or the same problem seen by two sources) are
 * combined, so severity never degrades silently.
 */
export function maxCostRisk(a: CostRisk, b: CostRisk): CostRisk {
  return COST_RISK_ORDER[a] <= COST_RISK_ORDER[b] ? a : b;
}

/**
 * Merges analysis results, preserving existing reasons and combining suspectedUnused flags.
 */
export function mergeResults(
  baseResult: AnalysisResult,
  specificResult: AnalysisResult,
): AnalysisResult {
  return {
    costRisk: specificResult.costRisk,
    estimatedMonthlySavings:
      specificResult.estimatedMonthlySavings ??
      baseResult.estimatedMonthlySavings,
    reason: baseResult.reason + specificResult.reason,
    suspectedUnused:
      baseResult.suspectedUnused || specificResult.suspectedUnused,
  };
}
