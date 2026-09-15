"use client";

import TooltipIcon from "@/components/TooltipIcon";
import type { InsightSeverity } from "@/lib/insights/types";

interface MetricCardProps {
  /** Percentage change versus the previous period, when available. */
  deltaPct?: null | number;
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
  deltaPct,
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
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-bold tracking-tighter text-[#e6edf3] tabular-nums metric-value-glow">
          {value ?? "—"}
        </p>
        {suffix && (
          <span className="ml-1 text-sm font-medium text-gray-400">
            {suffix}
          </span>
        )}
        {hasDelta && (
          <span className="ml-3 text-sm font-semibold text-gray-400 tabular-nums">
            <span aria-hidden="true">{rising ? "↑" : "↓"}</span>{" "}
            <span className="sr-only">{rising ? "up" : "down"}</span>
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      {(target !== undefined || previousValue !== undefined) && (
        <p className="mt-1 text-xs text-gray-400">
          {previousValue !== undefined && previousValue !== null && (
            <span>previous {previousValue}</span>
          )}
          {target !== undefined && (
            <span>
              {previousValue !== undefined && previousValue !== null
                ? " · "
                : ""}
              target {target}
            </span>
          )}
        </p>
      )}
      {sparkline && <Sparkline points={sparkline} />}
    </div>
  );
}
