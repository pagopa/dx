"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleBarLineChart,
  SimpleLineChart,
  SimplePieChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import { COPILOT_REVIEW_ADOPTION_PCT, INSIGHT_THRESHOLDS } from "@/lib/config";
import { formatDecimal, formatNumber } from "@/lib/format";
import { severityFromTarget } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDateFormatters } from "@/lib/locale";
import { percentChange } from "@/lib/stats";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { copilotTooltips as tooltipContent } from "./tooltips";

interface CopilotAuthoredPr {
  createdAt: string;
  leadTimeDays: null | number;
  mergedAt: null | string;
  number: number;
  repository: string;
  title: string;
}

interface CopilotDashboardData {
  cards: {
    avgLeadTimeHoursWith: null | number;
    avgLeadTimeHoursWithout: null | number;
    copilotAuthoredMergedPrs: number;
    copilotAuthoredPrs: number;
    copilotCoauthoredCommits: number;
    copilotReviewedPrs: number;
    /** Share (0..1) of imported team commits carrying the Copilot trailer. */
    coauthoredCommitShare: null | number;
    /** Share (0..1) of merged PRs in the window with a Copilot review. */
    coverageShare: null | number;
    mergedPrs: number;
    previousCopilotAuthoredPrs: null | number;
    previousCopilotCoauthoredCommits: null | number;
    previousCopilotReviewedPrs: null | number;
    previousCoverageShare: null | number;
    previousLeadTimeHoursWith: null | number;
    totalTeamCommits: number;
  };
  coauthorLeadTimeTrend: {
    avgLeadTimeDays: null | number;
    coauthoredCommits: number;
    week: string;
  }[];
  commitsByRepository: { commits: number; repository: string }[];
  coverageTrend: {
    cumulativeWith: number;
    cumulativeWithout: number;
    week: string;
  }[];
  prSizeBuckets: {
    bucket: string;
    copilotReviewedPrs: number;
    mergedPrs: number;
    reviewRate: number;
  }[];
  recentAuthoredPrs: CopilotAuthoredPr[];
  reviewCombination: {
    copilotAndHuman: number;
    copilotOnly: number;
    humanOnly: number;
    noReview: number;
  };
  weeklyTrend: { reviewedPrs: number; reviews: number; week: string }[];
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function CopilotDashboard() {
  const colors = useSeriesColors();
  const { short } = useDateFormatters();
  const { days, repositories, setDays, setRepositories } =
    useDashboardFilters();

  const { data, error, loading, refetch } =
    useDashboardData<CopilotDashboardData>("copilot", {
      days,
      repositories,
    });

  // The adapter reports a 0..1 share; the cards speak in percentages. Rounded
  // to two decimals so the raw float multiplication leaves no artifacts.
  const coveragePct =
    data?.cards.coverageShare != null
      ? Math.round(data.cards.coverageShare * 10_000) / 100
      : null;
  const previousCoveragePct =
    data?.cards.previousCoverageShare != null
      ? Math.round(data.cards.previousCoverageShare * 10_000) / 100
      : null;

  const coverageSeverity =
    coveragePct != null
      ? severityFromTarget(coveragePct, COPILOT_REVIEW_ADOPTION_PCT, {
          higherIsBetter: true,
          tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
        })
      : undefined;

  const coauthoredCommitSharePct =
    data?.cards.coauthoredCommitShare != null
      ? Math.round(data.cards.coauthoredCommitShare * 10_000) / 100
      : null;

  const reviewCombinationData = data
    ? [
        {
          name: "Copilot + human",
          value: data.reviewCombination.copilotAndHuman,
        },
        { name: "Human only", value: data.reviewCombination.humanOnly },
        { name: "Copilot only", value: data.reviewCombination.copilotOnly },
        { name: "No review", value: data.reviewCombination.noReview },
      ].filter((entry) => entry.value > 0)
    : [];

  const deltaFromPrevious = (
    current: null | number,
    previous: null | number,
  ) =>
    current != null && previous != null
      ? percentChange(current, previous)
      : null;

  const leadTimeComparison = [
    data?.cards.avgLeadTimeHoursWith != null
      ? {
          avgHours: data.cards.avgLeadTimeHoursWith,
          label: "With Copilot review",
        }
      : null,
    data?.cards.avgLeadTimeHoursWithout != null
      ? {
          avgHours: data.cards.avgLeadTimeHoursWithout,
          label: "Without Copilot review",
        }
      : null,
  ].filter(
    (entry): entry is { avgHours: number; label: string } => entry !== null,
  );

  const hasReviewData =
    (data?.coverageTrend.length ?? 0) > 0 ||
    (data?.weeklyTrend.length ?? 0) > 0;
  const hasAgentData =
    (data?.recentAuthoredPrs.length ?? 0) > 0 ||
    (data?.commitsByRepository.length ?? 0) > 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">Copilot</h2>
        <TooltipIcon content={tooltipContent.title} label="Copilot" />
      </div>
      <DashboardFilters
        onRepositoriesChange={setRepositories}
        onTimeIntervalChange={setDays}
        repositories={repositories}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <DataFreshness
            className="mb-2"
            referenceDate={data.meta.referenceDate}
            windowDays={days}
          />
          <InsightsPanel
            className="mb-6"
            insights={data.insights}
            periodDays={days}
          />

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              deltaDirection="higher-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(coveragePct, previousCoveragePct)}
              label="Review Coverage"
              previousValue={previousCoveragePct}
              sampleSize={data.cards.mergedPrs}
              severity={coverageSeverity}
              sparkline={data.weeklyTrend.map((row) => row.reviewedPrs)}
              suffix="%"
              target={COPILOT_REVIEW_ADOPTION_PCT}
              tooltip={tooltipContent.copilotReviewCoverage}
              value={coveragePct}
            />
            <MetricCard
              deltaDirection="higher-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.copilotReviewedPrs,
                data.cards.previousCopilotReviewedPrs,
              )}
              label="Copilot Reviewed PRs"
              previousValue={data.cards.previousCopilotReviewedPrs}
              sampleSize={data.cards.mergedPrs}
              tooltip={tooltipContent.copilotReviewedPrs}
              value={data.cards.copilotReviewedPrs}
            />
            <MetricCard
              breakdown={
                data.cards.avgLeadTimeHoursWithout != null
                  ? [
                      {
                        label: "without",
                        value: `${formatNumber(data.cards.avgLeadTimeHoursWithout, 1)} h`,
                      },
                    ]
                  : undefined
              }
              deltaDirection="lower-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.avgLeadTimeHoursWith,
                data.cards.previousLeadTimeHoursWith,
              )}
              label="Lead Time with Copilot Review"
              previousValue={data.cards.previousLeadTimeHoursWith}
              suffix="hours"
              tooltip={tooltipContent.copilotLeadTime}
              value={data.cards.avgLeadTimeHoursWith}
            />
            <MetricCard
              breakdown={[
                {
                  label: "agent PRs",
                  value: formatDecimal(data.cards.copilotAuthoredPrs),
                },
                ...(coauthoredCommitSharePct != null
                  ? [
                      {
                        label: "of team commits",
                        value: `${formatNumber(coauthoredCommitSharePct, 1)}%`,
                      },
                    ]
                  : []),
              ]}
              deltaDirection="higher-is-better"
              deltaLabel="vs prev"
              deltaPct={deltaFromPrevious(
                data.cards.copilotCoauthoredCommits,
                data.cards.previousCopilotCoauthoredCommits,
              )}
              label="Copilot Co-authored Commits"
              previousValue={data.cards.previousCopilotCoauthoredCommits}
              tooltip={tooltipContent.copilotCoauthoredCommits}
              value={data.cards.copilotCoauthoredCommits}
            />
          </div>

          {/* Copilot Code Review */}
          {hasReviewData && (
            <>
              <h3 className="mt-2 mb-4 text-base font-semibold text-foreground">
                Copilot Code Review
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SimpleLineChart
                  data={data.coverageTrend}
                  lines={[
                    {
                      color: colors.blue,
                      key: "cumulativeWith",
                      name: "With Copilot review",
                    },
                    {
                      color: colors.gray,
                      key: "cumulativeWithout",
                      name: "Without Copilot review",
                    },
                  ]}
                  title="Cumulative PRs by Copilot Review"
                  tooltip={tooltipContent.coverageTrend}
                  unit="PRs"
                  xKey="week"
                />
                <SimplePieChart
                  data={reviewCombinationData}
                  title="Who Reviewed the Merged PRs"
                  tooltip={tooltipContent.reviewCombination}
                />
                <SimpleBarChart
                  bars={[
                    {
                      color: colors.blue,
                      key: "reviews",
                      name: "Copilot reviews",
                    },
                  ]}
                  data={data.weeklyTrend}
                  title="Copilot Reviews per Week"
                  tooltip={tooltipContent.weeklyTrend}
                  unit="reviews"
                  xKey="week"
                />
                <SimpleBarChart
                  bars={[
                    {
                      color: colors.purple,
                      key: "reviewRate",
                      name: "% with Copilot review",
                    },
                  ]}
                  caption="merged PRs"
                  data={data.prSizeBuckets}
                  layout="vertical"
                  title="Copilot Review Rate by PR Size"
                  tooltip={tooltipContent.prSizeBuckets}
                  unit="%"
                  xKey="bucket"
                />
                <SimpleBarLineChart
                  bar={{
                    color: colors.green,
                    key: "coauthoredCommits",
                    name: "Co-authored commits",
                    unit: "commits",
                  }}
                  data={data.coauthorLeadTimeTrend}
                  line={{
                    color: colors.amber,
                    key: "avgLeadTimeDays",
                    name: "Avg PR lead time",
                    unit: "days",
                  }}
                  title="Copilot Co-authored Commits vs PR Lead Time"
                  tooltip={tooltipContent.coauthorLeadTimeTrend}
                  xKey="week"
                />
                <SimpleBarChart
                  bars={[
                    {
                      color: colors.amber,
                      key: "avgHours",
                      name: "Avg lead time",
                    },
                  ]}
                  data={leadTimeComparison}
                  layout="vertical"
                  title="Lead Time: With vs Without Copilot Review"
                  tooltip={tooltipContent.leadTimeComparison}
                  unit="hours"
                  xKey="label"
                />
              </div>
            </>
          )}

          {/* Copilot Coding Agent */}
          {hasAgentData && (
            <>
              <h3 className="mt-8 mb-4 text-base font-semibold text-foreground">
                Copilot Coding Agent
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SimpleBarChart
                  bars={[
                    {
                      color: colors.green,
                      key: "commits",
                      name: "Co-authored commits",
                    },
                  ]}
                  caption="top 10"
                  data={data.commitsByRepository}
                  layout="vertical"
                  maxItems={10}
                  sortKey="commits"
                  title="Copilot Co-authored Commits per Repository"
                  tooltip={tooltipContent.commitsByRepository}
                  unit="commits"
                  xKey="repository"
                />
                <DataTable
                  columns={[
                    { key: "repository", label: "Repository" },
                    {
                      key: "number",
                      label: "PR",
                      renderCell: (value) => `#${value}`,
                    },
                    { key: "title", label: "Title" },
                    {
                      key: "createdAt",
                      label: "Opened",
                      renderCell: (value) => short(String(value)),
                    },
                    {
                      key: "mergedAt",
                      label: "Merged",
                      renderCell: (value) =>
                        value ? short(String(value)) : "—",
                    },
                    {
                      key: "leadTimeDays",
                      label: "Lead time (days)",
                      renderCell: (value) =>
                        typeof value === "number" ? formatDecimal(value) : "—",
                    },
                  ]}
                  data={data.recentAuthoredPrs}
                  title="Pull Requests Opened by the Copilot Agent"
                  tooltip={tooltipContent.recentAuthoredPrs}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
