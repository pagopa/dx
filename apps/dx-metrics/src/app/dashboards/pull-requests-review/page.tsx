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
import { severityFromTarget } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { pullRequestsReviewTooltips as tooltipContent } from "./tooltips";

interface PrReviewDashboardData {
  cards: {
    avgTimeToFirstReview: null | number;
    avgTimeToMerge: null | number;
  };
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
          <InsightsPanel className="mb-6" insights={data.insights} />
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <MetricCard
              label="Avg Time to First Review"
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
              label="Avg Time to Merge"
              suffix="hours"
              tooltip={tooltipContent.avgTimeToMerge}
              value={data.cards.avgTimeToMerge}
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
                  title="Avg Time to First Review (weekly, hours)"
                  tooltip={tooltipContent.timeToFirstReviewTrend}
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
