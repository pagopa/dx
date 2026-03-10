"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { MetricCard } from "@/components/MetricCard";
import {
  SimpleLineChart,
  SimpleBarChart,
  DataTable,
} from "@/components/Charts";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import { pullRequestsReviewTooltips as tooltipContent } from "./tooltips";

interface PrReviewDashboardData {
  cards: {
    avgTimeToFirstReview: number | null;
    avgTimeToMerge: number | null;
  };
  timeToFirstReviewTrend: { week: string; avg_hours_to_first_review: number }[];
  timeToMergeTrend: { week: string; avg_hours_to_merge: number }[];
  reviewDistribution: {
    reviewer: string;
    total_reviews: number;
    approvals: number;
    change_requests: number;
  }[];
  reviewMatrix: {
    author: string;
    reviewer: string;
    review_count: number;
  }[];
}

export default function PullRequestsReviewDashboard() {
  const { repository, days, setRepository, setDays } = useDashboardFilters();

  const { data, loading, error, refetch } =
    useDashboardData<PrReviewDashboardData>("pull-requests-review", {
      repository,
      days,
    });

  const reviewMatrixWithoutSelfReviews =
    data?.reviewMatrix.filter(({ author, reviewer }) => author !== reviewer) ??
    [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          Pull Requests Review
        </h2>
        <TooltipIcon content={tooltipContent.title} />
      </div>
      <DashboardFilters
        repository={repository}
        timeInterval={days}
        onRepositoryChange={setRepository}
        onTimeIntervalChange={setDays}
      />
      <DashboardRequestState
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4">
            <MetricCard
              label="Avg Time to First Review"
              value={data.cards.avgTimeToFirstReview}
              suffix="hours"
              tooltip={tooltipContent.avgTimeToFirstReview}
            />
            <MetricCard
              label="Avg Time to Merge"
              value={data.cards.avgTimeToMerge}
              suffix="hours"
              tooltip={tooltipContent.avgTimeToMerge}
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
                  title="Avg Time to First Review (weekly, hours)"
                  data={data.timeToFirstReviewTrend}
                  xKey="week"
                  lines={[
                    {
                      key: "avg_hours_to_first_review",
                      name: "Hours to First Review",
                      color: "#2563eb",
                    },
                  ]}
                  tooltip={tooltipContent.timeToFirstReviewTrend}
                />
                <SimpleLineChart
                  title="Avg Time to Merge after Approval (weekly, hours)"
                  data={data.timeToMergeTrend}
                  xKey="week"
                  lines={[
                    {
                      key: "avg_hours_to_merge",
                      name: "Hours to Merge",
                      color: "#dc2626",
                    },
                  ]}
                  tooltip={tooltipContent.timeToMergeTrend}
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
                  title="Reviews per Reviewer"
                  data={data.reviewDistribution}
                  xKey="reviewer"
                  layout="vertical"
                  bars={[
                    {
                      key: "approvals",
                      name: "Approvals",
                      color: "#16a34a",
                      stackId: "reviews",
                    },
                    {
                      key: "change_requests",
                      name: "Change Requests",
                      color: "#dc2626",
                      stackId: "reviews",
                    },
                  ]}
                  tooltip={tooltipContent.reviewsPerReviewer}
                />
                <DataTable
                  title="Reviewer Stats"
                  columns={[
                    { key: "reviewer", label: "Reviewer" },
                    { key: "total_reviews", label: "Total" },
                    { key: "approvals", label: "Approvals" },
                    { key: "change_requests", label: "Changes Requested" },
                  ]}
                  data={data.reviewDistribution}
                  tooltip={tooltipContent.reviewerStats}
                />
              </div>
              <div className="mt-4">
                <DataTable
                  title="Author → Reviewer Matrix"
                  columns={[
                    { key: "author", label: "Author" },
                    { key: "reviewer", label: "Reviewer" },
                    { key: "review_count", label: "Reviews" },
                  ]}
                  data={reviewMatrixWithoutSelfReviews}
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
