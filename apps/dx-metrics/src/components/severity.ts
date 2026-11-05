/**
 * Single source of truth for how insight severity is rendered.
 *
 * Both `InsightsPanel` and `MetricCard` surface the same severity vocabulary
 * ("Critical", "Attention", …); keeping the classes and labels here stops the
 * two surfaces from drifting apart as thresholds or wording change.
 */

import type { InsightSeverity } from "@/lib/insights/types";

export interface SeverityStyle {
  /** Left accent applied to a metric card (`border-l-*`). */
  readonly accent: string;
  /** Compact pill used for badges and summary chips. */
  readonly badge: string;
  /** Card surface for an insight of this severity. */
  readonly card: string;
  /** Text glyph reinforcing the severity without relying on colour alone. */
  readonly icon: string;
  /** Human-readable label. */
  readonly label: string;
}

export const SEVERITY_STYLES: Record<InsightSeverity, SeverityStyle> = {
  critical: {
    accent: "border-l-red-500",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300",
    card: "border-red-500/40 bg-red-50 dark:bg-red-950/20",
    icon: "▲",
    label: "Critical",
  },
  neutral: {
    accent: "border-l-border",
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    card: "border-border bg-card",
    icon: "•",
    label: "Info",
  },
  positive: {
    accent: "border-l-green-500",
    badge: "bg-green-500/15 text-green-700 dark:text-green-300",
    card: "border-green-600/40 bg-green-50 dark:bg-green-950/20",
    icon: "✔",
    label: "Positive",
  },
  warning: {
    accent: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    card: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20",
    icon: "!",
    label: "Attention",
  },
};

/** Summary chips are shown in urgency order. */
export const SEVERITY_SUMMARY_ORDER: readonly InsightSeverity[] = [
  "critical",
  "warning",
  "positive",
  "neutral",
];

/** Lower-case labels used by the compact summary chips. */
export const SEVERITY_SUMMARY_LABELS: Record<InsightSeverity, string> = {
  critical: "critical",
  neutral: "info",
  positive: "positive",
  warning: "attention",
};
