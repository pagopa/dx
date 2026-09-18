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
import { SEVERITY_STYLES } from "@/components/severity";
import { INSIGHT_THRESHOLDS } from "@/lib/config";
import { severityFromUpperThreshold } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { contributorsTooltips as tooltipContent } from "./tooltips";

interface ContributorRow {
  commits: number;
  login: string;
  medianLeadTimeDays: null | number;
  merges: number;
  prsCreated: number;
  prsMerged: number;
  reposTouched: number;
  reviewsGiven: number;
}

interface ContributorsData {
  activityTrend: { contributors: number; prsMerged: number; week: string }[];
  contributors: ContributorRow[];
  mergers: {
    login: string;
    merges: number;
    repos: number;
    share: number;
  }[];
  mergesByRepository: {
    mergers: number;
    repository: string;
    topMerger: string;
    topMergerMerges: number;
    topMergerShare: number;
    totalMerges: number;
  }[];
  ownershipByRepo: {
    repository: string;
    topAuthor: string;
    topAuthorCommits: number;
    topAuthorShare: number;
    totalCommits: number;
  }[];
  summary: {
    activeContributors: number;
    distinctMergers: number;
    mergedPrCount: number;
    topContributorShare: number;
    topMergerShare: number;
    totalCommits: number;
    totalReviews: number;
  };
  insights: Insight[];
  meta: { referenceDate: string };
}

/** Converts a 0..1 share to a 2-decimal percentage without float artifacts. */
const toPercent = (share: number): number => Math.round(share * 10_000) / 100;

function GitHubUserLink({ login }: { login: string }) {
  return (
    <a
      className="text-blue-600 hover:underline"
      href={`https://github.com/${login}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      {login}
    </a>
  );
}

function GitHubRepoLink({ repository }: { repository: string }) {
  return (
    <a
      className="text-blue-600 hover:underline"
      href={`https://github.com/${repository}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      {repository}
    </a>
  );
}

/**
 * Renders a 0..1 share as a percentage badge coloured by the shared severity
 * vocabulary. Above the threshold the badge turns amber/red so a concentrated
 * bus factor stands out without a separate legend.
 */
function ShareBadge({
  share,
  threshold,
}: {
  share: number;
  threshold: number;
}) {
  const style = SEVERITY_STYLES[severityFromUpperThreshold(share, threshold)];

  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}
    >
      {toPercent(share)}%
    </span>
  );
}

export default function ContributorsDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters({
    mode: "all-repositories-and-time",
  });

  const { data, error, loading, refetch } = useDashboardData<ContributorsData>(
    "contributors",
    { days, repository },
  );

  const topMergerSeverity = data
    ? severityFromUpperThreshold(
        data.summary.topMergerShare,
        INSIGHT_THRESHOLDS.mergeBusFactorShare,
      )
    : undefined;

  const contributorChartData =
    data?.contributors.slice(0, 10).map((contributor) => ({
      activity:
        contributor.prsMerged + contributor.reviewsGiven + contributor.commits,
      commits: contributor.commits,
      login: contributor.login,
      prsMerged: contributor.prsMerged,
      reviewsGiven: contributor.reviewsGiven,
    })) ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          Contributors &amp; Ownership
        </h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Contributors & Ownership"
        />
      </div>
      <p className="mb-6 max-w-3xl text-sm text-gray-400">
        Workload, merge ownership, and bus factor across every configured
        repository, or a single one when filtered. These readings describe load
        and continuity risk, not a performance ranking of individuals.
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

          {/* Top cards. The merge-bus-factor card carries the same severity as
              its insight so the headline and the reading cannot disagree. */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Active Contributors"
              tooltip={tooltipContent.activeContributors}
              value={data.summary.activeContributors}
            />
            <MetricCard
              label="Merged PRs"
              tooltip={tooltipContent.mergedPrCount}
              value={data.summary.mergedPrCount}
            />
            <MetricCard
              label="Distinct Mergers"
              tooltip={tooltipContent.distinctMergers}
              value={data.summary.distinctMergers}
            />
            <MetricCard
              label="Top Merger Share"
              severity={topMergerSeverity}
              suffix="%"
              tooltip={tooltipContent.topMergerShare}
              value={toPercent(data.summary.topMergerShare)}
            />
          </div>

          {/* Merge ownership (bus factor) */}
          <h3 className="mt-8 mb-4 text-base font-semibold text-white">
            Merge ownership (bus factor)
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: SERIES_COLORS.blue,
                  key: "merges",
                  name: "Merges",
                },
              ]}
              data={data.mergers}
              layout="vertical"
              maxItems={10}
              sortKey="merges"
              title="Merges per Merger"
              tooltip={tooltipContent.mergesPerMerger}
              unit="merges"
              xKey="login"
            />
            <DataTable
              columns={[
                {
                  key: "login",
                  label: "Merger",
                  renderCell: (value) => (
                    <GitHubUserLink login={String(value)} />
                  ),
                },
                { key: "merges", label: "Merges" },
                { key: "repos", label: "Repos" },
                {
                  key: "share",
                  label: "Share %",
                  renderCell: (value) => `${toPercent(Number(value))}%`,
                },
              ]}
              data={data.mergers}
              title="Merger Stats"
              tooltip={tooltipContent.mergerStats}
            />
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  key: "repository",
                  label: "Repository",
                  renderCell: (value) => (
                    <GitHubRepoLink repository={String(value)} />
                  ),
                },
                { key: "totalMerges", label: "Merges" },
                { key: "mergers", label: "Mergers" },
                {
                  key: "topMerger",
                  label: "Top merger",
                  renderCell: (value) => (
                    <GitHubUserLink login={String(value)} />
                  ),
                },
                {
                  key: "topMergerShare",
                  label: "Top share %",
                  renderCell: (value) => (
                    <ShareBadge
                      share={Number(value)}
                      threshold={INSIGHT_THRESHOLDS.mergeBusFactorShare}
                    />
                  ),
                },
              ]}
              data={data.mergesByRepository}
              title="Merge Concentration by Repository"
              tooltip={tooltipContent.mergeConcentration}
            />
          </div>

          {/* Contributors */}
          <h3 className="mt-8 mb-4 text-base font-semibold text-white">
            Contributors
          </h3>
          <div className="mb-4">
            <SimpleBarChart
              bars={[
                {
                  color: SERIES_COLORS.blue,
                  key: "prsMerged",
                  name: "PRs merged",
                  stackId: "activity",
                },
                {
                  color: SERIES_COLORS.purple,
                  key: "reviewsGiven",
                  name: "Reviews",
                  stackId: "activity",
                },
                {
                  color: SERIES_COLORS.amber,
                  key: "commits",
                  name: "Commits",
                  stackId: "activity",
                },
              ]}
              data={contributorChartData}
              layout="vertical"
              maxItems={10}
              sortKey="activity"
              title="Top Contributors"
              tooltip={tooltipContent.topContributors}
              unit="activities"
              xKey="login"
            />
          </div>
          <DataTable
            columns={[
              {
                key: "login",
                label: "Contributor",
                renderCell: (value) => <GitHubUserLink login={String(value)} />,
              },
              { key: "prsCreated", label: "PRs created" },
              { key: "prsMerged", label: "PRs merged" },
              { key: "reviewsGiven", label: "Reviews" },
              { key: "merges", label: "Merges" },
              { key: "commits", label: "Commits" },
              { key: "reposTouched", label: "Repos" },
              {
                key: "medianLeadTimeDays",
                label: "Median lead time (days)",
                renderCell: (value) =>
                  value === null || value === undefined
                    ? "—"
                    : Number(value).toFixed(1),
              },
            ]}
            data={data.contributors}
            title="Contributor Activity"
            tooltip={tooltipContent.contributorActivity}
          />

          {/* Code ownership */}
          <h3 className="mt-8 mb-4 text-base font-semibold text-white">
            Code ownership
          </h3>
          <DataTable
            columns={[
              {
                key: "repository",
                label: "Repository",
                renderCell: (value) => (
                  <GitHubRepoLink repository={String(value)} />
                ),
              },
              { key: "totalCommits", label: "Commits" },
              {
                key: "topAuthor",
                label: "Top author",
                renderCell: (value) => <GitHubUserLink login={String(value)} />,
              },
              {
                key: "topAuthorShare",
                label: "Top author share %",
                renderCell: (value) => (
                  <ShareBadge
                    share={Number(value)}
                    threshold={INSIGHT_THRESHOLDS.teamBusFactorShare}
                  />
                ),
              },
            ]}
            data={data.ownershipByRepo}
            title="Ownership by Repository"
            tooltip={tooltipContent.ownershipByRepo}
          />

          {/* Activity trend */}
          <div className="mt-8">
            <SimpleLineChart
              data={data.activityTrend}
              lines={[
                {
                  color: SERIES_COLORS.blue,
                  key: "prsMerged",
                  name: "Merged PRs",
                },
                {
                  color: SERIES_COLORS.purple,
                  key: "contributors",
                  name: "Contributors",
                },
              ]}
              title="Activity Trend"
              tooltip={tooltipContent.activityTrend}
              xKey="week"
            />
          </div>
        </>
      )}
    </div>
  );
}
