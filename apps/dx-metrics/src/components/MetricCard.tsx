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
      aria-hidden
      className="mt-2 text-gray-500"
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
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const rising = hasDelta && deltaPct > 0;

  return (
    <div
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-all hover:border-[#8b949e]${accent}`}
    >
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
        {tooltip && <TooltipIcon content={tooltip} />}
      </p>
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-bold tracking-tighter text-[#e6edf3] metric-value-glow">
          {value ?? "—"}
        </p>
        {suffix && (
          <span className="ml-1 text-sm font-medium text-gray-400">
            {suffix}
          </span>
        )}
        {hasDelta && (
          <span className="ml-3 text-sm font-semibold text-gray-400">
            {rising ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      {(target !== undefined || previousValue !== undefined) && (
        <p className="mt-1 text-xs text-gray-500">
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
