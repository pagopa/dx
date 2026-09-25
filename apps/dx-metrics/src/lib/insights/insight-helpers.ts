/** Reusable computations and formatting for insight rules. */

import { linearRegression, percentChange } from "@/lib/stats";
import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";

import type { Insight, InsightSeverity } from "./types";

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  neutral: 2,
  positive: 3,
  warning: 1,
};

/** Orders insights by urgency, then by id for deterministic rendering. */
export const sortInsights = (insights: readonly Insight[]): Insight[] =>
  [...insights].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.id.localeCompare(right.id),
  );

/** Arithmetic mean of a numeric list, or `null` for an empty list. */
export const mean = (values: readonly number[]): number | null => {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) {
    return null;
  }

  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
};

/**
 * Flags a reading that rests on too few observations.
 *
 * Returns `"low"` only when the sample size is known and below the threshold;
 * an unknown sample size returns `undefined` (the field is optional) so the
 * absence of a count never silently claims confidence.
 */
export const confidenceFromSample = (
  sampleSize: null | number | undefined,
  minimum: number = INSIGHT_THRESHOLDS.minReliableSampleSize,
): "low" | undefined =>
  sampleSize !== null && sampleSize !== undefined && sampleSize < minimum
    ? "low"
    : undefined;

/**
 * Flags a trend reading whose fitted line explains too little of the variance.
 * A change between two halves only means something when the series actually
 * trends, not when it is noise whose two halves happen to differ.
 */
export const confidenceFromFit = (
  rSquared: number,
  minimum: number = METRIC_TARGETS.minTrendRSquared,
): "low" | undefined => (rSquared >= minimum ? undefined : "low");

/** Formats a 0..1 ratio as a percentage string. */
export const formatPercent = (ratio: number, digits = 0): string =>
  `${(ratio * 100).toFixed(digits)}%`;

/** Formats a number with a fixed number of decimals. */
export const formatNumber = (value: number, digits = 1): string =>
  value.toFixed(digits);

/**
 * Formats a spread multiplier (p95 / p50) for prose, omitting it when the ratio
 * is unstable or extreme (e.g. a median close to zero).
 */
export const formatSpreadRatio = (ratio: number, maxRatio = 20): string =>
  Number.isFinite(ratio) && ratio > 0 && ratio <= maxRatio
    ? ` (${formatNumber(ratio)}x)`
    : "";

/** Describes a change over a series by comparing its first and second halves. */
export interface HalfSplitChange {
  readonly deltaPct: number;
  readonly firstAverage: number;
  readonly rSquared: number;
  readonly secondAverage: number;
}

/**
 * Compares the average of the first half of a series with the second half.
 * Returns `null` when the series is too short or the baseline is zero.
 */
export const halfSplitChange = (
  values: readonly number[],
): HalfSplitChange | null => {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length < 4) {
    return null;
  }

  const midpoint = Math.floor(clean.length / 2);
  const firstAverage = mean(clean.slice(0, midpoint));
  const secondAverage = mean(clean.slice(midpoint));

  if (firstAverage === null || secondAverage === null) {
    return null;
  }

  const deltaPct = percentChange(secondAverage, firstAverage);

  if (deltaPct === null) {
    return null;
  }

  const regression = linearRegression(clean.map((y, x) => ({ x, y })));

  return {
    deltaPct,
    firstAverage,
    rSquared: regression?.rSquared ?? 0,
    secondAverage,
  };
};

/**
 * Classifies a percentage change into a severity.
 * `higherIsBetter` flips the meaning of the sign.
 * Changes below `significantChangePct` are neutral.
 */
export const severityFromChange = (
  deltaPct: number,
  options: { higherIsBetter: boolean; significantChangePct: number },
): InsightSeverity => {
  if (Math.abs(deltaPct) < options.significantChangePct) {
    return "neutral";
  }

  const improving = options.higherIsBetter ? deltaPct > 0 : deltaPct < 0;
  return improving ? "positive" : "warning";
};

/**
 * Classifies a value against a target. Being on the wrong side of the target
 * is neutral within a tolerance band, a warning beyond it, and critical (red)
 * once it exceeds `criticalMultiplier` times the target in the bad direction.
 */
export const severityFromTarget = (
  value: number,
  target: number,
  options: {
    higherIsBetter: boolean;
    tolerancePct: number;
    criticalMultiplier?: number;
  },
): InsightSeverity => {
  const goalMet = options.higherIsBetter ? value >= target : value <= target;

  if (goalMet) {
    return "positive";
  }

  const tolerance = Math.abs(target) * (options.tolerancePct / 100);
  const withinTolerance = options.higherIsBetter
    ? value >= target - tolerance
    : value <= target + tolerance;

  if (withinTolerance) {
    return "neutral";
  }

  const multiplier =
    options.criticalMultiplier ?? INSIGHT_THRESHOLDS.criticalMultiplier;
  const critical = options.higherIsBetter
    ? value < target / multiplier
    : value > target * multiplier;

  return critical ? "critical" : "warning";
};

/**
 * Classifies a value against an upper threshold where lower is better: below
 * the threshold is positive (green), above it a warning, and beyond
 * `criticalMultiplier` times the threshold a critical (red).
 */
export const severityFromUpperThreshold = (
  value: number,
  threshold: number,
  criticalMultiplier: number = INSIGHT_THRESHOLDS.criticalMultiplier,
): InsightSeverity => {
  if (value <= threshold) {
    return "positive";
  }

  return value > threshold * criticalMultiplier ? "critical" : "warning";
};

/**
 * Combines target status with the direction of change. A metric that is inside
 * its target but worsening should not read as "positive", otherwise a green
 * card can carry a rising bad delta.
 */
export const severityFromTargetWithTrend = (
  value: number,
  target: number,
  deltaPct: null | number,
  options: {
    higherIsBetter: boolean;
    significantChangePct: number;
    tolerancePct: number;
  },
): InsightSeverity => {
  const targetSeverity = severityFromTarget(value, target, options);

  if (deltaPct === null || targetSeverity !== "positive") {
    return targetSeverity;
  }

  const worsening = options.higherIsBetter
    ? deltaPct < -options.significantChangePct
    : deltaPct > options.significantChangePct;

  return worsening ? "warning" : targetSeverity;
};
