"use client";

import {
  DataTable,
  SERIES_COLORS,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import {
  INSIGHT_THRESHOLDS,
  METRIC_TARGETS,
  ORGANIZATION,
  WEEKLY_BUCKET_THRESHOLD_DAYS,
} from "@/lib/config";
import { formatNumber, formatShortDate } from "@/lib/format";
import {
  severityFromTargetWithTrend,
  severityFromUpperThreshold,
} from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDateFormatters } from "@/lib/locale";
import { percentChange } from "@/lib/stats";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { pullRequestsTooltips as tooltipContent } from "./tooltips";

interface PrDashboardData {
  cards: {
    avgLeadTime: null | number;
    avgTimeToMerge: null | number;
    contributors: null | number;
    /** Same metrics over the immediately preceding, equally-sized window. */
    previousAvgTimeToMerge: null | number;
    previousContributors: null | number;
    previousTotalPrs: null | number;
    totalPrs: null | number;
  };
  cumulatedNewPrs: { cumulativeCount: number; date: string }[];
  leadTimeMovingAvg: { avgLeadTimeDays: number; week: string }[];
  leadTimePercentiles: {
    count: number;
    p50: null | number;
    p85: null | number;
    p95: null | number;
  };
  leadTimeTrend: { date: string; trendLine: number }[];
  mergedPrs: { date: string; prCount: number }[];
  newPrs: { date: string; prCount: number }[];
  /**
   * Optional so a cached payload from before this field existed still renders:
   * the cards fall back to zero instead of throwing.
   */
  openBacklog?: {
    closedUnmerged: number;
    openNow: number;
    stale: number;
  };
  prComments: { avgComments: number; week: string }[];
  prSize: { avgAdditions: number; week: string }[];
  prSizeDistribution: {
    avgAdditions: number;
    avgLeadTimeDays: null | number;
    prCount: number;
    sizeRange: string;
  }[];
  prsByContributor: { author: string; prCount: number }[];
  slowestPrs: {
    createdAt: string;
    leadTimeDays: number;
    mergedAt: string;
    number: number;
    title: string;
  }[];
  stalePrs?: {
    author: null | string;
    idleDays: number;
    number: number;
    title: string;
    updatedAt: string;
  }[];
  unmergedPrs: { date: string; openPrs: number }[];
  previousLeadTime: null | number;
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function PullRequestsDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters();

  const { data, error, loading, refetch } = useDashboardData<PrDashboardData>(
    "pull-requests",
    {
      days,
      repository,
    },
  );

  // The SQL bucket switches from day to week above the shared threshold; the
  // caption repeats it on the chart so a point is never read as the wrong unit.
  const bucketCaption =
    days < WEEKLY_BUCKET_THRESHOLD_DAYS ? "per day" : "per week";

  const repositoryUrl = `https://github.com/${ORGANIZATION}/${repository}`;
  // A cached payload from before these fields existed must not be rendered as a
  // real zero backlog; the cards only appear when the snapshot is present, so an
  // empty backlog is distinguishable from unavailable data.
  const openBacklog = data?.openBacklog;
  const stalePrs = data?.stalePrs ?? [];
  // Share of the open backlog that has gone quiet; drives the stale card badge
  // with the same threshold the insight uses.
  const staleShare =
    openBacklog && openBacklog.openNow > 0
      ? openBacklog.stale / openBacklog.openNow
      : null;
  const staleSeverity =
    staleShare === null
      ? undefined
      : severityFromUpperThreshold(staleShare, INSIGHT_THRESHOLDS.stalePrShare);

  // The same current-vs-previous comparison the lead-time card uses, so every
  // summary card reads the change against the adjacent window the same way.
  const deltaFromPrevious = (
    current: null | number,
    previous: null | number,
  ) => (current != null && previous != null ? percentChange(current, previous) : null);

  // The window is anchored to the latest activity, not to today, so the exact
  // range is shown on the contributor count.
  const { range } = useDateFormatters();
  const periodBreakdown = data
    ? [{ label: "period", value: range(data.meta.referenceDate, days) }]
    : undefined;

  // One comparison everywhere: the current period versus the immediately
  // preceding, equally-sized window — the same value shown as `previous` — so
  // the card, the insight, and the "previous" figure cannot disagree.
  const leadTimeDelta =
    data?.cards.avgLeadTime != null && data.previousLeadTime != null
      ? percentChange(data.cards.avgLeadTime, data.previousLeadTime)
      : null;
  const leadTimeSeverity =
    data?.cards.avgLeadTime != null
      ? severityFromTargetWithTrend(
          data.cards.avgLeadTime,
          METRIC_TARGETS.leadTimeDays,
          leadTimeDelta,
          {
            higherIsBetter: false,
            significantChangePct: METRIC_TARGETS.significantChangePct,
            tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
          },
        )
      : undefined;
  const leadTimeSparkline = data?.leadTimeMovingAvg.map(
    (row) => row.avgLeadTimeDays,
  );
  // Percentiles sit next to the mean on the card: the headline is an average,
  // and a right-skewed distribution needs the median and the tail in view.
  const leadTimeBreakdown = data?.leadTimePercentiles
    ? [
        {
          label: "median",
          value: `${formatNumber(data.leadTimePercentiles.p50, 1)} d`,
        },
        {
          label: "p95",
          value: `${formatNumber(data.leadTimePercentiles.p95, 1)} d`,
        },
      ]
    : undefined;
  // Lower is better here, so the acceptable region is everything from zero up
  // to the target plus its tolerance; the band mirrors the severity rule.
  const leadTimeToleranceBand = {
    from: 0,
    to:
      METRIC_TARGETS.leadTimeDays *
      (1 + INSIGHT_THRESHOLDS.targetTolerancePct / 100),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
              Pull Request <span className="text-green-500">Insights</span>
            </h2>
            <TooltipIcon
              content={tooltipContent.title}
              label="Pull Request Insights"
            />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Analyzing engineering velocity and collaboration patterns.
          </p>
        </div>
      </div>

      <DashboardFilters
        onRepositoryChange={setRepository}
        onTimeIntervalChange={setDays}
        repository={repository}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <div className="space-y-8">
          <DataFreshness referenceDate={data.meta.referenceDate} windowDays={days} />
          <InsightsPanel insights={data.insights} periodDays={days} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              breakdown={leadTimeBreakdown}
              label="Mean Lead Time"
              suffix="days"
              tooltip={tooltipContent.avgLeadTime}
              value={data.cards.avgLeadTime}
              deltaPct={leadTimeDelta}
              deltaDirection="lower-is-better"
              deltaLabel="vs prev"
              previousValue={data.previousLeadTime}
              sampleSize={data.leadTimePercentiles.count}
              target={METRIC_TARGETS.leadTimeDays}
              severity={leadTimeSeverity}
              sparkline={leadTimeSparkline}
            />
            <MetricCard
              deltaDirection="lower-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.avgTimeToMerge,
                data.cards.previousAvgTimeToMerge,
              )}
              label="Avg Time to Merge"
              previousValue={data.cards.previousAvgTimeToMerge}
              suffix="hours"
              tooltip={tooltipContent.avgTimeToMerge}
              value={data.cards.avgTimeToMerge}
            />
            <MetricCard
              deltaDirection="higher-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.totalPrs,
                data.cards.previousTotalPrs,
              )}
              label="Total PRs"
              previousValue={data.cards.previousTotalPrs}
              tooltip={tooltipContent.totalPrs}
              value={data.cards.totalPrs}
            />
            <MetricCard
              breakdown={periodBreakdown}
              deltaDirection="higher-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.contributors,
                data.cards.previousContributors,
              )}
              label="Contributors"
              previousValue={data.cards.previousContributors}
              tooltip={tooltipContent.contributors}
              value={data.cards.contributors}
            />
          </div>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Flow
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.green,
                    key: "avgLeadTimeDays",
                    name: "Days",
                  },
                ]}
                caption="per week"
                data={data.leadTimeMovingAvg}
                referenceLines={[
                  { label: "target", value: METRIC_TARGETS.leadTimeDays },
                ]}
                targetBand={leadTimeToleranceBand}
                title="Mean Lead Time (Weekly)"
                tooltip={tooltipContent.leadTimeMovingAvg}
                unit="days"
                xKey="week"
              />
              <SimpleLineChart
                caption="per week"
                data={data.leadTimeTrend}
                lines={[
                  { color: SERIES_COLORS.red, key: "trendLine", name: "Trend" },
                ]}
                title="Lead Time Trend (within period)"
                tooltip={tooltipContent.leadTimeTrend}
                unit="days"
                xKey="date"
                zeroBaseline={false}
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.blue,
                    key: "prCount",
                    name: "Merged PRs",
                  },
                ]}
                caption={bucketCaption}
                data={data.mergedPrs}
                title="Merged Pull Requests"
                tooltip={tooltipContent.mergedPrs}
                tooltipFormatter={(value) => value.toFixed(0)}
                unit="PRs"
                xKey="date"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.green,
                    key: "prCount",
                    name: "New PRs",
                  },
                ]}
                caption={bucketCaption}
                data={data.newPrs}
                title="New Pull Requests"
                tooltip={tooltipContent.newPrs}
                tooltipFormatter={(value) => value.toFixed(0)}
                unit="PRs"
                xKey="date"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Backlog
            </h3>
            {openBacklog && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                  label="Open PRs Now"
                  tooltip={tooltipContent.openPrsNow}
                  value={openBacklog.openNow}
                />
                <MetricCard
                  label={`Stale Open PRs (> ${METRIC_TARGETS.staleOpenPrDays} days)`}
                  sampleSize={openBacklog.openNow}
                  severity={staleSeverity}
                  tooltip={tooltipContent.staleOpenPrs}
                  value={openBacklog.stale}
                />
                <MetricCard
                  label="Closed Without Merge"
                  tooltip={tooltipContent.closedUnmerged}
                  value={openBacklog.closedUnmerged}
                />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleLineChart
                caption="per day"
                data={data.unmergedPrs}
                lines={[
                  {
                    color: SERIES_COLORS.amber,
                    key: "openPrs",
                    name: "Open PRs",
                  },
                ]}
                title="Open Pull Requests (never merged)"
                tooltip={tooltipContent.unmergedPrs}
                unit="PRs"
                xKey="date"
              />
              <SimpleLineChart
                caption="per day"
                data={data.cumulatedNewPrs}
                lines={[
                  {
                    color: SERIES_COLORS.purple,
                    key: "cumulativeCount",
                    name: "Cumulated New PRs",
                  },
                ]}
                title="Cumulated New Pull Requests"
                tooltip={tooltipContent.cumulatedNewPrs}
                unit="PRs"
                xKey="date"
              />
            </div>
            {stalePrs.length > 0 && (
              <DataTable
                columns={[
                  {
                    key: "number",
                    label: "#",
                    renderCell: (value) => (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`${repositoryUrl}/pull/${value}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        #{value}
                      </a>
                    ),
                  },
                  { key: "title", label: "Title" },
                  {
                    key: "author",
                    label: "Author",
                    renderCell: (value) =>
                      value ? (
                        <a
                          className="text-blue-600 hover:underline"
                          href={`https://github.com/${value}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {String(value)}
                        </a>
                      ) : (
                        "—"
                      ),
                  },
                  { key: "idleDays", label: "Idle (days)" },
                  {
                    key: "updatedAt",
                    label: "Last activity",
                    renderCell: (value) => formatShortDate(String(value)),
                  },
                ]}
                data={stalePrs}
                title={`Stale Pull Requests (> ${METRIC_TARGETS.staleOpenPrDays} days idle)`}
                tooltip={tooltipContent.stalePrs}
              />
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Size &amp; collaboration
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgAdditions",
                    name: "Avg Additions",
                  },
                ]}
                caption="per week"
                data={data.prSize}
                title="Pull Requests Size (weekly average)"
                tooltip={tooltipContent.prSize}
                unit="lines"
                xKey="week"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgComments",
                    name: "Avg Comments",
                  },
                ]}
                caption="per week"
                data={data.prComments}
                title="Pull Requests Comments (weekly average)"
                tooltip={tooltipContent.prComments}
                unit="comments"
                xKey="week"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgAdditions",
                    name: "Avg Additions",
                  },
                ]}
                data={data.prSizeDistribution}
                title="Pull Requests Size (avg additions)"
                tooltip={tooltipContent.prSizeDistribution}
                unit="lines"
                xKey="sizeRange"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.amber,
                    key: "avgLeadTimeDays",
                    name: "Avg Lead Time",
                  },
                ]}
                data={data.prSizeDistribution.filter(
                  (row) => row.avgLeadTimeDays !== null,
                )}
                title="Avg Lead Time by PR Size"
                tooltip={tooltipContent.prSizeLeadTime}
                unit="days"
                xKey="sizeRange"
              />
            </div>
          </section>

          <div className="mt-8">
            <DataTable
              columns={[
                { key: "title", label: "Title" },
                { key: "leadTimeDays", label: "Lead Time (days)" },
                {
                  key: "number",
                  label: "#",
                  renderCell: (value) => (
                    <a
                      className="text-blue-600 hover:underline"
                      href={`${repositoryUrl}/pull/${value}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      #{value}
                    </a>
                  ),
                },
                { key: "createdAt", label: "Created" },
                { key: "mergedAt", label: "Merged" },
              ]}
              data={data.slowestPrs}
              title="Slowest Pull Requests"
              tooltip={tooltipContent.slowestPrs}
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: SERIES_COLORS.blue,
                  key: "prCount",
                  name: "Pull Requests",
                },
              ]}
              caption="top 8"
              data={data.prsByContributor}
              layout="vertical"
              maxItems={8}
              sortKey="prCount"
              title="Top Contributors"
              tooltip={tooltipContent.prsByContributor}
              tooltipFormatter={(value) => value.toFixed(0)}
              unit="PRs"
              xKey="author"
            />
            <DataTable
              columns={[
                {
                  key: "author",
                  label: "Contributor",
                  renderCell: (value) => {
                    const author = String(value);
                    return (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`https://github.com/${author}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {author}
                      </a>
                    );
                  },
                },
                { key: "prCount", label: "Pull Requests" },
              ]}
              data={data.prsByContributor}
              title="Pull Requests by Contributor"
              tooltip={tooltipContent.prsByContributor}
            />
          </div>
        </div>
      )}
    </div>
  );
}
