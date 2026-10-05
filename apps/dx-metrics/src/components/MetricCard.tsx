"use client";

import { SEVERITY_STYLES } from "@/components/severity";
import TooltipIcon from "@/components/TooltipIcon";
import { formatDecimal, formatInteger } from "@/lib/format";
import type { InsightSeverity } from "@/lib/insights/types";

interface MetricCardProps {
  /**
   * Breakdown of the same metric by statistic (e.g. median, p95), rendered
   * next to the target. Keeps a skewed distribution visible on the card so the
   * headline number is not read as if it were the only aggregation.
   */
  breakdown?: readonly { label: string; value: string }[];
  /** Percentage change versus the previous period, when available. */
  deltaPct?: null | number;
  /**
   * Direction the metric is expected to move in. When provided, the delta is
   * coloured and labelled as favourable or not, so an arrow is never ambiguous.
   */
  deltaDirection?: "higher-is-better" | "lower-is-better";
  /**
   * Names what `deltaPct` compares (e.g. "trend"). Shown before the arrow so a
   * trend-based delta is not mistaken for a change in the headline value.
   */
  deltaLabel?: string;
  label: string;
  /** Value from the previous period, shown next to the delta. */
  previousValue?: null | number;
  /**
   * Number of observations behind the headline value. Shown as `n=…` so a
   * metric computed over a handful of items is not read like one over thousands.
   */
  sampleSize?: number;
  /** Optional severity accent driven by insight rules. */
  severity?: InsightSeverity;
  /** Optional series rendered as a sparkline. */
  sparkline?: readonly number[];
  suffix?: string;
  /** Reference target, shown as `target: X`. */
  target?: number;
  tooltip?: string;
  value: null | number | string;
}

const Sparkline = ({ points }: { points: readonly number[] }) => {
  const finite = points.filter((point) => Number.isFinite(point));

  if (finite.length < 2) {
    return null;
  }

  const max = Math.max(...finite);
  const min = Math.min(...finite);
  const span = max - min || 1;
  const width = 64;
  const height = 16;
  const coordinates = finite
    .map((point, index) => {
      const x = (index / (finite.length - 1)) * width;
      const y = height - ((point - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="mt-2 text-muted-foreground"
      height={height}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={coordinates}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
};

/**
 * Renders a single headline metric. All comparison props are optional so the
 * component stays backward compatible with dashboards that do not compute them.
 */
export function MetricCard({
  breakdown,
  deltaDirection,
  deltaPct,
  deltaLabel,
  label,
  previousValue,
  sampleSize,
  severity,
  sparkline,
  suffix,
  target,
  tooltip,
  value,
}: MetricCardProps) {
  const severityStyle =
    severity !== undefined ? SEVERITY_STYLES[severity] : null;
  const accent = severityStyle ? ` border-l-4 ${severityStyle.accent}` : "";
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const isFlat = hasDelta && deltaPct === 0;
  const rising = hasDelta && deltaPct > 0;
  // When the desired direction is known, say whether the move is good. An
  // unchanged value and a missing direction both stay neutral, so an arrow
  // never implies a judgement.
  const favorable =
    hasDelta && !isFlat && deltaDirection !== undefined
      ? deltaDirection === "higher-is-better"
        ? deltaPct > 0
        : deltaPct < 0
      : null;
  const deltaClass =
    favorable === null
      ? "text-muted-foreground"
      : favorable
        ? "text-green-700 dark:text-green-400"
        : "text-amber-700 dark:text-amber-400";
  // Group long counts (1,234) but leave decimals and small values untouched.
  const displayValue =
    typeof value === "number" &&
    Number.isInteger(value) &&
    Math.abs(value) >= 1000
      ? formatInteger(value)
      : (value ?? "—");

  // A single metadata line: the statistic breakdown, the sample size, the
  // target, and the comparison against the previous period all read together.
  // Internal spaces are non-breaking so an item like "p95 20.4 d" never splits
  // across lines.
  const nonBreaking = (text: string) => text.replace(/ /g, "\u00A0");
  const metaParts = [
    previousValue !== undefined && previousValue !== null
      ? nonBreaking(`previous ${formatDecimal(previousValue)}`)
      : null,
    ...(breakdown ?? []).map((item) =>
      nonBreaking(`${item.label} ${item.value}`),
    ),
    sampleSize !== undefined
      ? nonBreaking(`n=${formatInteger(sampleSize)}`)
      : null,
    target !== undefined ? nonBreaking(`target ${target}`) : null,
  ].filter((part): part is string => part !== null);

  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-muted-foreground${accent}`}
    >
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {tooltip && <TooltipIcon content={tooltip} label={label} />}
        {severityStyle && (
          <span
            className={`ml-auto shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityStyle.badge}`}
          >
            <span aria-hidden="true" className="mr-1">
              {severityStyle.icon}
            </span>
            {severityStyle.label}
          </span>
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline">
        <p className="text-3xl font-bold tracking-tighter text-foreground tabular-nums">
          {displayValue}
        </p>
        {suffix && (
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
        {hasDelta && (
          <span
            className={`ml-3 whitespace-nowrap text-sm font-semibold tabular-nums ${deltaClass}`}
          >
            {deltaLabel && <span className="mr-1">{deltaLabel}</span>}
            <span aria-hidden="true">
              {isFlat ? "→" : rising ? "↑" : "↓"}
            </span>{" "}
            <span className="sr-only">
              {isFlat ? "no change" : rising ? "up" : "down"}
              {favorable === null
                ? ""
                : favorable
                  ? " (improving)"
                  : " (worsening)"}
            </span>
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      {metaParts.length > 0 && (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
          {metaParts.map((part, index) => (
            <span className="whitespace-nowrap" key={`${index}-${part}`}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="mr-1 text-subtle-foreground"
                >
                  ·
                </span>
              )}
              {part}
            </span>
          ))}
        </p>
      )}
      {sparkline && <Sparkline points={sparkline} />}
    </div>
  );
}
