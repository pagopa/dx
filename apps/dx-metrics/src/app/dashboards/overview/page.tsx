"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import TooltipIcon from "@/components/TooltipIcon";
import { sortInsights } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { overviewTooltips as tooltipContent } from "./tooltips";

/** Dashboards whose insights feed the executive summary. */
const INSIGHT_ENDPOINTS = [
  "pull-requests",
  "pull-requests-review",
  "workflows",
  "iac",
  "dx-adoption",
  "techradar",
  "dx-team",
  "tracker",
  "releases",
] as const;

/** Human-readable name of the dashboard an insight comes from. */
const ENDPOINT_LABELS: Record<(typeof INSIGHT_ENDPOINTS)[number], string> = {
  "dx-adoption": "DX Adoption",
  "dx-team": "DX Team",
  iac: "IaC PRs",
  "pull-requests": "Pull Requests",
  "pull-requests-review": "PR Reviews",
  releases: "DX Releases",
  techradar: "Techradar",
  tracker: "DX Tracker",
  workflows: "Workflows",
};

interface InsightPayload {
  insights?: Insight[];
  meta?: { referenceDate?: string };
}

export default function OverviewDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [referenceDate, setReferenceDate] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [warning, setWarning] = useState<null | string>(null);

  const queryString = useMemo(
    () => new URLSearchParams({ days: String(days), repository }).toString(),
    [days, repository],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setWarning(null);

      try {
        const responses = await Promise.all(
          INSIGHT_ENDPOINTS.map((endpoint) =>
            fetch(`/api/dashboards/${endpoint}?${queryString}`, {
              cache: "no-store",
              signal,
            }),
          ),
        );

        // Keep each payload paired with the dashboard it came from so the
        // executive summary can label where an insight originated.
        const parsed = await Promise.all(
          responses.map(async (response, index) => ({
            endpoint: INSIGHT_ENDPOINTS[index],
            payload: response.ok
              ? ((await response.json()) as InsightPayload)
              : null,
          })),
        );
        const payloads = parsed.filter(
          (
            entry,
          ): entry is {
            endpoint: (typeof INSIGHT_ENDPOINTS)[number];
            payload: InsightPayload;
          } => entry.payload !== null,
        );
        const failed = responses.length - payloads.length;

        // A single failing dashboard degrades the summary; losing every
        // dashboard is a hard failure and uses the standard error UI.
        if (failed === INSIGHT_ENDPOINTS.length) {
          throw new Error(
            `All ${failed} dashboards failed to load. Try again in a moment.`,
          );
        }

        const dates = payloads
          .map((entry) => entry.payload.meta?.referenceDate)
          .filter((value): value is string => typeof value === "string")
          .sort();

        if (!signal?.aborted) {
          setInsights(
            sortInsights(
              payloads.flatMap(({ endpoint, payload }) =>
                (payload.insights ?? []).map((insight) => ({
                  ...insight,
                  source: ENDPOINT_LABELS[endpoint],
                })),
              ),
            ),
          );
          setReferenceDate(dates.at(-1) ?? null);
          setWarning(
            failed > 0
              ? `${failed} of ${INSIGHT_ENDPOINTS.length} dashboards failed to load. The summary below is incomplete.`
              : null,
          );
        }
      } catch (caughtError) {
        if (!signal?.aborted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown error",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [queryString],
  );

  useEffect(() => {
    const controller = new AbortController();

    // Fetching on mount is expected to update state after the awaited fetches,
    // not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Executive Summary</h2>
        <TooltipIcon content={tooltipContent.title} label="Executive Summary" />
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Most urgent insights across every dashboard for the selected repository.
        For the cross-repository comparison see the Benchmark page.
      </p>

      <DashboardFilters
        onRepositoryChange={setRepository}
        onTimeIntervalChange={setDays}
        repository={repository}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={() => load()}
      />

      {referenceDate && <DataFreshness referenceDate={referenceDate} />}

      {warning ? (
        <div
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          {warning}
        </div>
      ) : null}

      <InsightsPanel
        className="mt-4"
        defaultOpen
        insights={insights}
        limit={9}
        periodDays={days}
      />
    </div>
  );
}
