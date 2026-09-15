/**
 * Pure aggregation for cross-repository benchmark metrics.
 *
 * Turns a set of per-repository values into a comparable metric: the
 * organisation median plus each repository's percentile rank, so a reader can
 * see whether a value is good or bad relative to its peers.
 */

import { median, percentileRank } from "@/lib/stats";

/** A metric value for a single repository. */
export interface BenchmarkValueRow {
  /** Number of observations behind `value`, when known. */
  readonly count?: null | number;
  readonly repository: string;
  readonly value: null | number;
}

/** A repository's value with its position within the peer set. */
export interface BenchmarkEntry {
  /** Number of observations behind `value`, when known. */
  readonly count: null | number;
  readonly percentileRank: null | number;
  readonly repository: string;
  readonly value: null | number;
}

/** Grouping used to organise benchmark metrics in the overview page. */
export type BenchmarkCategory = "adoption" | "delivery" | "quality";

/** A comparable metric across repositories. */
export interface BenchmarkMetric {
  readonly category: BenchmarkCategory;
  readonly entries: readonly BenchmarkEntry[];
  readonly key: string;
  readonly label: string;
  readonly lowerIsBetter: boolean;
  readonly median: null | number;
  readonly unit?: string;
}

export interface BenchmarkMetricInput {
  readonly category: BenchmarkCategory;
  readonly key: string;
  readonly label: string;
  readonly lowerIsBetter: boolean;
  readonly rows: readonly BenchmarkValueRow[];
  readonly unit?: string;
}

/** Builds a benchmark metric from per-repository values. */
export const buildBenchmarkMetric = (
  input: BenchmarkMetricInput,
): BenchmarkMetric => {
  const values = input.rows
    .map((row) => row.value)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

  const entries = input.rows.map((row) => ({
    count: row.count ?? null,
    percentileRank:
      row.value === null || !Number.isFinite(row.value)
        ? null
        : percentileRank(row.value, values),
    repository: row.repository,
    value: row.value,
  }));

  return {
    category: input.category,
    entries,
    key: input.key,
    label: input.label,
    lowerIsBetter: input.lowerIsBetter,
    median: median(values),
    unit: input.unit,
  };
};

/**
 * A repository is "best in class" when it sits at the good end of the
 * distribution and "needs attention" at the bad end.
 */
export const classifyPercentile = (
  percentileRankValue: null | number,
  lowerIsBetter: boolean,
): "best" | "needs-attention" | "middle" | "unknown" => {
  if (percentileRankValue === null) {
    return "unknown";
  }

  const goodEnd = lowerIsBetter
    ? percentileRankValue <= 0.25
    : percentileRankValue >= 0.75;
  const badEnd = lowerIsBetter
    ? percentileRankValue >= 0.75
    : percentileRankValue <= 0.25;

  if (goodEnd) {
    return "best";
  }
  if (badEnd) {
    return "needs-attention";
  }
  return "middle";
};
