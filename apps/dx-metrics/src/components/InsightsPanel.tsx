"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { formatWithUnit } from "@/lib/format";
import type { Insight, InsightSeverity } from "@/lib/insights/types";

interface InsightsPanelProps {
  className?: string;
  /** Whether the panel starts expanded. Defaults to collapsed. */
  defaultOpen?: boolean;
  insights: readonly Insight[];
  /** Maximum number of insights to display. Defaults to 5. */
  limit?: number;
}

interface SeverityStyle {
  readonly badge: string;
  readonly card: string;
  readonly icon: string;
  readonly label: string;
}

const SEVERITY_STYLES: Record<InsightSeverity, SeverityStyle> = {
  critical: {
    badge: "bg-red-500/15 text-red-300",
    card: "border-red-500/40 bg-red-950/20",
    icon: "▲",
    label: "Critical",
  },
  neutral: {
    badge: "bg-slate-500/15 text-slate-300",
    card: "border-[#30363d] bg-[#0d1117]",
    icon: "•",
    label: "Info",
  },
  positive: {
    badge: "bg-green-500/15 text-green-300",
    card: "border-green-600/40 bg-green-950/20",
    icon: "✔",
    label: "Positive",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-300",
    card: "border-amber-500/40 bg-amber-950/20",
    icon: "!",
    label: "Attention",
  },
};

/** Summary chips are shown in urgency order. */
const SUMMARY_ORDER: readonly InsightSeverity[] = [
  "critical",
  "warning",
  "positive",
  "neutral",
];

const SUMMARY_LABELS: Record<InsightSeverity, string> = {
  critical: "critical",
  neutral: "info",
  positive: "positive",
  warning: "attention",
};

const DeltaBadge = ({ deltaPct }: { deltaPct: number }) => {
  const rising = deltaPct > 0;

  return (
    <span className="text-xs font-medium text-gray-400">
      {rising ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(0)}%
    </span>
  );
};

const InsightCard = ({ insight }: { insight: Insight }) => {
  const style = SEVERITY_STYLES[insight.severity];

  return (
    <article
      className={`flex flex-col gap-2 rounded-xl border p-5 shadow-sm ${style.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">
          <span aria-hidden className="mr-2">
            {style.icon}
          </span>
          {insight.title}
        </h3>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      <p className="text-sm text-gray-300">{insight.detail}</p>

      {insight.value && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#e6edf3]">
            {formatWithUnit(
              insight.value.current,
              insight.value.unit,
              Number.isInteger(insight.value.current) ? 0 : 1,
            )}
          </span>
          {insight.value.deltaPct !== undefined && (
            <DeltaBadge deltaPct={insight.value.deltaPct} />
          )}
        </div>
      )}

      {insight.evidence && insight.evidence.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {insight.evidence.map((item, index) => (
            <li
              className="truncate font-mono text-xs text-gray-400"
              key={`${index}-${item.label}`}
              title={item.label}
            >
              {item.href ? (
                <a
                  className="hover:text-gray-200 hover:underline"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      )}

      {insight.action && (
        <p className="mt-auto text-xs font-medium text-gray-400">
          <span className="uppercase tracking-wider text-gray-500">Next: </span>
          {insight.action}
        </p>
      )}
    </article>
  );
};

/**
 * Collapsible insights panel. Collapsed by default so charts stay front and
 * centre; the header always shows the total and a severity summary.
 */
export function InsightsPanel({
  className = "",
  defaultOpen = false,
  insights,
  limit = 5,
}: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const visible = insights.slice(0, limit);
  const isTruncated = visible.length < insights.length;

  // Counts reflect what the panel will actually show, so the header never
  // promises more cards than the reader gets.
  const counts = visible.reduce<Record<InsightSeverity, number>>(
    (accumulator, insight) => {
      accumulator[insight.severity] += 1;
      return accumulator;
    },
    { critical: 0, neutral: 0, positive: 0, warning: 0 },
  );

  return (
    <section
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] ${className}`}
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Insights
          <span className="rounded bg-[#21262d] px-2 py-0.5 text-xs text-gray-300">
            {isTruncated ? `top ${visible.length}` : visible.length}
          </span>
        </span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          {SUMMARY_ORDER.filter((severity) => counts[severity] > 0).map(
            (severity) => (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_STYLES[severity].badge}`}
                key={severity}
              >
                {counts[severity]} {SUMMARY_LABELS[severity]}
              </span>
            ),
          )}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[#30363d] p-5">
          {visible.length === 0 ? (
            <p className="text-sm text-gray-400">
              No relevant insights for the selected period.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((insight) => (
                <InsightCard insight={insight} key={insight.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
