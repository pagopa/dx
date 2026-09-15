"use client";

import TooltipIcon from "@/components/TooltipIcon";
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
   * Names what `deltaPct` compares (e.g. "trend"). Shown before the arrow so a
   * trend-based delta is not mistaken for a change in the headline value.
   */
  deltaLabel?: string;
  label: string;
  /** Value from the previous period, shown next to the delta. */
  previousValue?: null | number;
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

const SEVERITY_ACCENT: Record<InsightSeverity, string> = {
  critical: "border-l-red-500",
  neutral: "border-l-[#30363d]",
  positive: "border-l-green-500",
  warning: "border-l-amber-500",
};

/**
 * Severity is never carried by the accent colour alone: each level also renders
 * a labelled badge, using the same vocabulary as the insights panel.
 */
const SEVERITY_BADGE: Record<
  InsightSeverity,
  { className: string; icon: string; label: string }
> = {
  critical: {
    className: "bg-red-500/15 text-red-300",
    icon: "▲",
    label: "Critical",
  },
  neutral: {
    className: "bg-slate-500/15 text-slate-300",
    icon: "•",
    label: "Info",
  },
  positive: {
    className: "bg-green-500/15 text-green-300",
    icon: "✔",
    label: "Positive",
  },
  warning: {
    className: "bg-amber-500/15 text-amber-300",
    icon: "!",
    label: "Attention",
  },
};

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
      className="mt-2 text-gray-400"
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
  deltaPct,
  deltaLabel,
  label,
  previousValue,
  severity,
  sparkline,
  suffix,
  target,
  tooltip,
  value,
}: MetricCardProps) {
  const accent =
    severity !== undefined ? ` border-l-4 ${SEVERITY_ACCENT[severity]}` : "";
  const severityBadge =
    severity !== undefined ? SEVERITY_BADGE[severity] : null;
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const rising = hasDelta && deltaPct > 0;

  // A single metadata line: the statistic breakdown, the target, and the
  // comparison against the previous period all read together. Internal spaces
  // are non-breaking so an item like "p95 20.4 d" never splits across lines.
  const nonBreaking = (text: string) => text.replace(/ /g, "\u00A0");
  const metaParts = [
    previousValue !== undefined && previousValue !== null
      ? nonBreaking(`previous ${previousValue}`)
      : null,
    ...(breakdown ?? []).map((item) =>
      nonBreaking(`${item.label} ${item.value}`),
    ),
    target !== undefined ? nonBreaking(`target ${target}`) : null,
  ].filter((part): part is string => part !== null);

  return (
    <div
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-colors hover:border-[#8b949e]${accent}`}
    >
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
        {tooltip && <TooltipIcon content={tooltip} label={label} />}
        {severityBadge && (
          <span
            className={`ml-auto shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityBadge.className}`}
          >
            <span aria-hidden="true" className="mr-1">
              {severityBadge.icon}
            </span>
            {severityBadge.label}
          </span>
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline">
        <p className="text-3xl font-bold tracking-tighter text-[#e6edf3] tabular-nums metric-value-glow">
          {value ?? "—"}
        </p>
        {suffix && (
          <span className="ml-1 text-sm font-medium text-gray-400">
            {suffix}
          </span>
        )}
        {hasDelta && (
          <span className="ml-3 whitespace-nowrap text-sm font-semibold text-gray-400 tabular-nums">
            {deltaLabel && <span className="mr-1">{deltaLabel}</span>}
            <span aria-hidden="true">{rising ? "↑" : "↓"}</span>{" "}
            <span className="sr-only">{rising ? "up" : "down"}</span>
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      {metaParts.length > 0 && (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-gray-400">
          {metaParts.map((part, index) => (
            <span className="whitespace-nowrap" key={`${index}-${part}`}>
              {index > 0 && (
                <span aria-hidden="true" className="mr-1 text-gray-500">
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
