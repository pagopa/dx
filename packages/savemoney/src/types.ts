/**
 * Common types shared across all cloud providers
 */

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
