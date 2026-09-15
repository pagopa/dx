/**
 * Shared contract for dashboard insights.
 *
 * An insight is a deterministic, human-readable reading of a metric: what
 * changed, how much, and what to do about it. It is produced by pure functions
 * (see the sibling `build*Insights` modules) and rendered by `InsightsPanel`.
 */

/** How urgently an insight deserves attention. */
export type InsightSeverity = "positive" | "neutral" | "warning" | "critical";

/** The engineering concern an insight belongs to. */
export type InsightCategory =
  "velocity" | "quality" | "reliability" | "adoption" | "risk";

/** A metric value with an optional comparison against a previous value. */
export interface InsightValue {
  readonly current: number;
  readonly deltaPct?: number;
  /**
   * Names the statistic behind `current` (e.g. "average", "95th percentile").
   * Shown under the headline number so it is never mistaken for a different
   * statistic of the same metric rendered in a card nearby.
   */
  readonly label?: string;
  readonly previous?: number;
  readonly unit?: string;
}

/** A drill-down reference supporting an insight. */
export interface InsightEvidence {
  readonly href?: string;
  readonly label: string;
}

/** A single deterministic reading of the dashboard data. */
export interface Insight {
  readonly action?: string;
  readonly category: InsightCategory;
  /**
   * How much the sample size weakens the reading. `low` is set when the rule
   * fires on few observations; the panel surfaces it next to `sampleSize`.
   */
  readonly confidence?: "high" | "low";
  readonly detail: string;
  readonly evidence?: readonly InsightEvidence[];
  readonly id: string;
  /** Number of observations the insight is computed on, when known. */
  readonly sampleSize?: number;
  readonly severity: InsightSeverity;
  readonly title: string;
  readonly value?: InsightValue;
}

/** A dashboard payload enriched with its computed insights. */
export interface WithInsights {
  readonly insights: Insight[];
}
