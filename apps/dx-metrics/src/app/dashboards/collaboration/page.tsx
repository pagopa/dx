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
import {
  severityFromTarget,
  severityFromUpperThreshold,
} from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { collaborationTooltips as tooltipContent } from "./tooltips";

// Row shapes are type aliases (not interfaces) so they satisfy the chart
// primitives' `Record<string, unknown>` data prop without a manual map.
type CollaborationAwaitingReview = {
  ageDays: number;
  author: null | string;
  number: number;
  repository: string;
  reviewDecision: null | string;
  title: string;
};

type CollaborationReviewerLoad = {
  approvals: number;
  changeRequests: number;
  comments: number;
  dismissals: number;
  reviewer: string;
  totalReviews: number;
};

type CollaborationReviewerBehaviour = {
  login: string;
  otherReviews: number;
  ownReviews: number;
};

interface CollaborationDashboardData {
  awaitingReview: CollaborationAwaitingReview[];
  collaborationMatrix: {
    author: string;
    reviewCount: number;
    reviewer: string;
  }[];
  insights: Insight[];
  meta: { referenceDate: string };
  reviewTrend: { avgHoursToFirstReview: number; week: string }[];
  /** Reviews split by whether the reviewer authored the PR (self-review). */
  reviewerBehaviour: CollaborationReviewerBehaviour[];
  reviewerLoad: CollaborationReviewerLoad[];
  summary: {
    avgTimeToFirstReviewHours: null | number;
    awaitingReviewCount: number;
    churnShare: null | number;
    overdueAwaitingCount: number;
    selfReviewCount: number;
    selfReviewShare: null | number;
    topReviewerShare: null | number;
    totalReviews: number;
  };
}

export default function CollaborationDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters({
    mode: "all-repositories-and-time",
  });

  const { data, error, loading, refetch } =
    useDashboardData<CollaborationDashboardData>("collaboration", {
      days,
      repository,
    });

  const matrixWithoutSelfReviews =
    data?.collaborationMatrix.filter(
      ({ author, reviewer }) => author !== reviewer,
    ) ?? [];

  const firstReviewSeverity =
    data?.summary.avgTimeToFirstReviewHours != null
      ? severityFromTarget(
          data.summary.avgTimeToFirstReviewHours,
          METRIC_TARGETS.timeToFirstReviewHours,
          {
            higherIsBetter: false,
            tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
          },
        )
      : undefined;

  // The adapter reports a 0..1 share; the card speaks in percentages. Rounded
  // to two decimals so the float multiplication leaves no artifacts.
  const topReviewerSharePct =
    data?.summary.topReviewerShare != null
      ? Math.round(data.summary.topReviewerShare * 10_000) / 100
      : null;

  const topReviewerSeverity =
    data?.summary.topReviewerShare != null
      ? severityFromUpperThreshold(
          data.summary.topReviewerShare,
          INSIGHT_THRESHOLDS.reviewBusFactorShare,
        )
      : undefined;

  // Self-reviews / all reviews, as a percentage, with the same threshold the
  // insight uses so the card and the reading agree.
  const selfReviewSharePct =
    data?.summary.selfReviewShare != null
      ? Math.round(data.summary.selfReviewShare * 10_000) / 100
      : null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          Review &amp; Collaboration
        </h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Review & Collaboration"
        />
      </div>
      <p className="mb-4 max-w-3xl text-sm text-gray-400">
        One view of people dynamics across every configured repository, or a
        single one when filtered: how long pull requests wait for a first
        review, how concentrated review work is, and where the queue is
        backing up.
      </p>
      <DashboardFilters
        mode="all-repositories-and-time"
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
            windowDays={days}
          />
          <InsightsPanel
            className="mb-6"
            insights={data.insights}
            periodDays={days}
          />

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Avg Time to First Review"
              sampleSize={data.summary.totalReviews}
              severity={firstReviewSeverity}
              sparkline={data.reviewTrend.map(
                (row) => row.avgHoursToFirstReview,
              )}
              suffix="hours"
              target={METRIC_TARGETS.timeToFirstReviewHours}
              tooltip={tooltipContent.avgTimeToFirstReview}
              value={data.summary.avgTimeToFirstReviewHours}
            />
            <MetricCard
              label="Top Reviewer Share"
              sampleSize={data.summary.totalReviews}
              severity={topReviewerSeverity}
              suffix="%"
              tooltip={tooltipContent.topReviewerShare}
              value={topReviewerSharePct}
            />
            <MetricCard
              breakdown={[
                {
                  label: "overdue",
                  value: formatNumber(data.summary.overdueAwaitingCount, 0),
                },
              ]}
              label="Awaiting Review"
              tooltip={tooltipContent.awaitingReview}
              value={data.summary.awaitingReviewCount}
            />
            <MetricCard
              label="Self-comments"
              sampleSize={
                data.summary.totalReviews + data.summary.selfReviewCount
              }
              suffix="%"
              tooltip={tooltipContent.selfReviewShare}
              value={selfReviewSharePct}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: SERIES_COLORS.green,
                  key: "totalReviews",
                  name: "Reviews",
                },
              ]}
              data={data.reviewerLoad}
              layout="vertical"
              maxItems={10}
              sortKey="totalReviews"
              title="Reviewer Load (top 10)"
              tooltip={tooltipContent.reviewerLoad}
              unit="reviews"
              xKey="reviewer"
              yAxisWidth={140}
            />
            <SimpleLineChart
              data={data.reviewTrend}
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
              title="Time to First Review (weekly, hours)"
              tooltip={tooltipContent.timeToFirstReviewTrend}
              unit="hours"
              xKey="week"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DataTable
              columns={[
                { key: "reviewer", label: "Reviewer" },
                { key: "totalReviews", label: "Total" },
                { key: "approvals", label: "Approvals" },
                { key: "changeRequests", label: "Changes Requested" },
                { key: "dismissals", label: "Dismissals" },
              ]}
              data={data.reviewerLoad}
              title="Reviewer Stats"
              tooltip={tooltipContent.reviewerStats}
            />
            <DataTable
              columns={[
                { key: "login", label: "Reviewer" },
                { key: "otherReviews", label: "On others' PRs" },
                { key: "ownReviews", label: "On own PRs (self-comments)" },
              ]}
              data={data.reviewerBehaviour}
              title="Own vs Other Reviews"
              tooltip={tooltipContent.reviewerBehaviour}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DataTable
              columns={[
                {
                  key: "number",
                  label: "PR",
                  renderCell: (value, row) => {
                    const number = Number(value);

                    return (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`https://github.com/${row.repository}/pull/${number}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        #{number}
                      </a>
                    );
                  },
                },
                { key: "title", label: "Title" },
                { key: "author", label: "Author" },
                { key: "ageDays", label: "Age (days)" },
                { key: "reviewDecision", label: "Review decision" },
              ]}
              data={data.awaitingReview}
              title="Awaiting Review"
              tooltip={tooltipContent.awaitingReviewTable}
            />
            <DataTable
              columns={[
                { key: "author", label: "Author" },
                { key: "reviewer", label: "Reviewer" },
                { key: "reviewCount", label: "Reviews" },
              ]}
              data={matrixWithoutSelfReviews}
              title="Author → Reviewer Matrix"
              tooltip={tooltipContent.authorReviewerMatrix}
            />
          </div>
        </>
      )}
    </div>
  );
}
