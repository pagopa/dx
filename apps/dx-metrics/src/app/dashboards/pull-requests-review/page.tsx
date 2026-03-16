"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Pull Requests Review</h2>
        <TooltipIcon content={tooltipContent.title} />
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
          <div className="mb-6 grid grid-cols-2 gap-4">
            <MetricCard
              label="Avg Time to First Review"
              suffix="hours"
              tooltip={tooltipContent.avgTimeToFirstReview}
              value={data.cards.avgTimeToFirstReview}
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
              <div className="grid grid-cols-2 gap-4">
                <SimpleLineChart
                  data={data.timeToFirstReviewTrend}
                  lines={[
                    {
                      color: "#2563eb",
                      key: "avgHoursToFirstReview",
                      name: "Hours to First Review",
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
                      color: "#dc2626",
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
              <div className="grid grid-cols-2 gap-4">
                <SimpleBarChart
                  bars={[
                    {
                      color: "#16a34a",
                      key: "approvals",
                      name: "Approvals",
                      stackId: "reviews",
                    },
                    {
                      color: "#dc2626",
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
