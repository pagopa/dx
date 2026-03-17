/**
 * Common types shared across all cloud providers
 */

import { ThresholdsSchema } from "./schema.js";

export type AnalysisResult = {
  costRisk: CostRisk;
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
 * Merges analysis results, preserving existing reasons and combining suspectedUnused flags.
 */
export function mergeResults(
  baseResult: AnalysisResult,
  specificResult: AnalysisResult,
): AnalysisResult {
  return {
    costRisk: specificResult.costRisk,
    reason: baseResult.reason + specificResult.reason,
    suspectedUnused:
      baseResult.suspectedUnused || specificResult.suspectedUnused,
  };
}
