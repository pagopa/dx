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
import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { severityFromTarget } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { pullRequestsReviewTooltips as tooltipContent } from "./tooltips";

interface PrReviewDashboardData {
  cards: {
    avgTimeToFirstReview: null | number;
    commentsPerPr: null | number;
    totalComments: null | number;
  };
  firstReviewPercentiles: {
    count: number;
    p50: null | number;
    p85: null | number;
    p95: null | number;
  };
  // Share (0..1) of merged PRs with no human review before merge (feeds the
  // insights) / with no comments at all (rendered as a card).
  mergedWithoutCommentsShare: null | number;
  mergedWithoutReviewShare: null | number;
  reviewDistribution: {
    approvals: number;
    changeRequests: number;
    reviewer: string;
    totalReviews: number;
  }[];
  reviewMatrix: {
    author: string;
    reviewCount: number;
    reviewer: string;
  }[];
  timeToFirstReviewTrend: { avgHoursToFirstReview: number; week: string }[];
  timeToMergeTrend: { avgHoursToMerge: number; week: string }[];
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function PullRequestsReviewDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters();

  const { data, error, loading, refetch } =
    useDashboardData<PrReviewDashboardData>("pull-requests-review", {
      days,
      repository,
    });

  const reviewMatrixWithoutSelfReviews =
    data?.reviewMatrix.filter(({ author, reviewer }) => author !== reviewer) ??
    [];

  const firstReviewSeverity =
    data?.cards.avgTimeToFirstReview != null
      ? severityFromTarget(
          data.cards.avgTimeToFirstReview,
          METRIC_TARGETS.timeToFirstReviewHours,
          {
            higherIsBetter: false,
            tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
          },
        )
      : undefined;

  const firstReviewBreakdown = data?.firstReviewPercentiles
    ? [
        {
          label: "median",
          value: `${formatNumber(data.firstReviewPercentiles.p50, 1)} h`,
        },
        {
          label: "p95",
          value: `${formatNumber(data.firstReviewPercentiles.p95, 1)} h`,
        },
      ]
    : undefined;
  // Acceptable region for a lower-is-better metric: from zero to the target
  // plus its tolerance, matching how the card severity is computed.
  const firstReviewToleranceBand = {
    from: 0,
    to:
      METRIC_TARGETS.timeToFirstReviewHours *
      (1 + INSIGHT_THRESHOLDS.targetTolerancePct / 100),
  };

  // The adapter reports a 0..1 share; the card speaks in percentages, so
  // convert once here. Rounded to two decimals: the share is stored with four
  // decimals, and the raw float multiplication leaves artifacts such as
  // 23.080000000000002.
  const mergedWithoutCommentsPct =
    data?.mergedWithoutCommentsShare != null
      ? Math.round(data.mergedWithoutCommentsShare * 10_000) / 100
      : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Pull Requests Review</h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Pull Requests Review"
        />
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
        <>
          <DataFreshness
            className="mb-2"
            referenceDate={data.meta.referenceDate}
          />
          <InsightsPanel
            className="mb-6"
            insights={data.insights}
            periodDays={days}
          />
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              breakdown={firstReviewBreakdown}
              label="Avg Time to First Review"
              sampleSize={data.firstReviewPercentiles.count}
              suffix="hours"
              tooltip={tooltipContent.avgTimeToFirstReview}
              value={data.cards.avgTimeToFirstReview}
              target={METRIC_TARGETS.timeToFirstReviewHours}
              severity={firstReviewSeverity}
              sparkline={data.timeToFirstReviewTrend.map(
                (row) => row.avgHoursToFirstReview,
              )}
            />
            <MetricCard
              label="Total Comments"
              tooltip={tooltipContent.totalComments}
              value={data.cards.totalComments}
            />
            <MetricCard
              label="Comments / PR"
              tooltip={tooltipContent.commentsPerPr}
              value={data.cards.commentsPerPr}
            />
            <MetricCard
              label="Merged Without Comments"
              suffix="%"
              tooltip={tooltipContent.mergedWithoutCommentsShare}
              value={mergedWithoutCommentsPct}
            />
          </div>

          {/* Review Timing */}
          {(data.timeToFirstReviewTrend.length > 0 ||
            data.timeToMergeTrend.length > 0) && (
            <>
              <h3 className="mt-2 mb-4 text-base font-semibold text-white">
                Review Timing
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SimpleLineChart
                  data={data.timeToFirstReviewTrend}
                  lines={[
                    {
                      color: SERIES_COLORS.blue,
                      key: "avgHoursToFirstReview",
                      name: "Hours to First Review",
                    },
                  ]}
                  referenceLines={[
                    {
                      label: "target",
                      value: METRIC_TARGETS.timeToFirstReviewHours,
                    },
                  ]}
                  targetBand={firstReviewToleranceBand}
                  title="Avg Time to First Review (weekly, hours)"
                  tooltip={tooltipContent.timeToFirstReviewTrend}
                  unit="hours"
                  xKey="week"
                />
                <SimpleLineChart
                  data={data.timeToMergeTrend}
                  lines={[
                    {
                      color: SERIES_COLORS.red,
                      key: "avgHoursToMerge",
                      name: "Hours to Merge",
                    },
                  ]}
                  title="Avg Time to Merge after Approval (weekly, hours)"
                  tooltip={tooltipContent.timeToMergeTrend}
                  unit="hours"
                  xKey="week"
                />
              </div>
            </>
          )}

          {/* Code Review Distribution */}
          {data.reviewDistribution.length > 0 && (
            <>
              <h3 className="mt-8 mb-4 text-base font-semibold text-white">
                Code Review Distribution
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SimpleBarChart
                  bars={[
                    {
                      color: SERIES_COLORS.green,
                      key: "approvals",
                      name: "Approvals",
                      stackId: "reviews",
                    },
                    {
                      color: SERIES_COLORS.red,
                      key: "changeRequests",
                      name: "Change Requests",
                      stackId: "reviews",
                    },
                  ]}
                  data={data.reviewDistribution}
                  layout="vertical"
                  title="Reviews per Reviewer"
                  tooltip={tooltipContent.reviewsPerReviewer}
                  xKey="reviewer"
                />
                <DataTable
                  columns={[
                    { key: "reviewer", label: "Reviewer" },
                    { key: "totalReviews", label: "Total" },
                    { key: "approvals", label: "Approvals" },
                    { key: "changeRequests", label: "Changes Requested" },
                  ]}
                  data={data.reviewDistribution}
                  title="Reviewer Stats"
                  tooltip={tooltipContent.reviewerStats}
                />
              </div>
              <div className="mt-4">
                <DataTable
                  columns={[
                    { key: "author", label: "Author" },
                    { key: "reviewer", label: "Reviewer" },
                    { key: "reviewCount", label: "Reviews" },
                  ]}
                  data={reviewMatrixWithoutSelfReviews}
                  title="Author → Reviewer Matrix"
                  tooltip={tooltipContent.authorReviewerMatrix}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
