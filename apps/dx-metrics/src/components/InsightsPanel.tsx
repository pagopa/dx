"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useId, useState } from "react";

import {
  SEVERITY_STYLES,
  SEVERITY_SUMMARY_LABELS,
  SEVERITY_SUMMARY_ORDER,
} from "@/components/severity";
import { formatInteger, formatWithUnit } from "@/lib/format";
import type { Insight, InsightSeverity } from "@/lib/insights/types";
import { focusRing } from "@/lib/utils";

interface InsightsPanelProps {
  className?: string;
  /** Whether the panel starts expanded. Defaults to collapsed. */
  defaultOpen?: boolean;
  insights: readonly Insight[];
  /** Maximum number of insights to display. Defaults to 5. */
  limit?: number;
  /**
   * Length of the analysis window in days, when the dashboard is time-windowed.
   * Shown in the header so it is explicit that insights cover the same period
   * as the cards and charts below, and not a different one.
   */
  periodDays?: number;
}

const DeltaBadge = ({ deltaPct }: { deltaPct: number }) => {
  const direction = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";

  return (
    <span className="text-xs font-medium text-gray-400 tabular-nums">
      <span aria-hidden="true">
        {direction === "up" ? "↑" : direction === "down" ? "↓" : "→"}
      </span>{" "}
      <span className="sr-only">
        {direction === "flat" ? "no change" : direction}
      </span>
      {Math.abs(deltaPct).toFixed(0)}%
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
          <span aria-hidden="true" className="mr-2">
            {style.icon}
          </span>
          {insight.title}
          {insight.source && (
            <span className="ml-2 align-middle text-[10px] font-normal uppercase tracking-wider text-gray-500">
              {insight.source}
            </span>
          )}
        </h3>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      <p className="text-sm text-gray-300">{insight.detail}</p>

      {insight.value && (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#e6edf3] tabular-nums">
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
          {insight.value.label && (
            <p className="text-xs text-gray-400">{insight.value.label}</p>
          )}
        </div>
      )}

      {(insight.sampleSize !== undefined || insight.confidence === "low") && (
        <p className="text-xs text-gray-400 tabular-nums">
          {insight.sampleSize !== undefined &&
            `n=${formatInteger(insight.sampleSize)}`}
          {insight.confidence === "low" && (
            <span
              className={`text-amber-300${insight.sampleSize !== undefined ? " ml-2" : ""}`}
            >
              low confidence
            </span>
          )}
        </p>
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
          <span className="uppercase tracking-wider text-gray-400">Next: </span>
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
  periodDays,
}: InsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const panelId = useId();

  const isLimited = insights.length > limit;
  const visible = showAll ? insights : insights.slice(0, limit);

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
        aria-controls={panelId}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left ${focusRing}`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {isOpen ? (
            <ChevronDown aria-hidden="true" size={16} />
          ) : (
            <ChevronRight aria-hidden="true" size={16} />
          )}
          Insights
          <span className="rounded bg-[#21262d] px-2 py-0.5 text-xs text-gray-300">
            {showAll || !isLimited
              ? insights.length
              : `top ${visible.length} of ${insights.length}`}
          </span>
          {periodDays !== undefined && (
            <span className="text-xs font-normal text-gray-400">
              last {periodDays} days
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          {SEVERITY_SUMMARY_ORDER.filter(
            (severity) => counts[severity] > 0,
          ).map((severity) => (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_STYLES[severity].badge}`}
              key={severity}
            >
              {counts[severity]} {SEVERITY_SUMMARY_LABELS[severity]}
            </span>
          ))}
        </span>
      </button>

      <div
        className="border-t border-[#30363d] p-5"
        hidden={!isOpen}
        id={panelId}
      >
        {visible.length === 0 ? (
          <p className="text-sm text-gray-400">
            No insights for the selected period. Try a wider time interval to
            include earlier activity.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((insight) => (
                <InsightCard insight={insight} key={insight.id} />
              ))}
            </div>
            {isLimited && (
              <div className="mt-4 flex justify-center">
                <button
                  aria-expanded={showAll}
                  className={`rounded-md border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-[#21262d] hover:text-white ${focusRing}`}
                  onClick={() => setShowAll((all) => !all)}
                  type="button"
                >
                  {showAll
                    ? `Show top ${limit}`
                    : `Show all ${insights.length} insights`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
