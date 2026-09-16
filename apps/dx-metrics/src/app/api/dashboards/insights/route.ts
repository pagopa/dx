/**
 * Executive-summary API route: aggregates the insights computed by every
 * dashboard adapter into a single payload.
 *
 * Previously `/dashboards/overview` fetched all nine dashboard endpoints from
 * the browser, each of which ran its full adapter — nine HTTP round trips plus
 * the full payload of every dashboard just to harvest the `insights` field.
 * Running the adapters server-side in parallel, one request, keeps the same
 * result with a fraction of the round trips and lets the response be cached.
 */
import { NextRequest, NextResponse } from "next/server";

import { getIacDashboard } from "@/adapters/db/iac/queries";
import { fetchDxAdoption } from "@/adapters/db/dx-adoption/queries";
import { fetchDxTeamDashboard } from "@/adapters/db/dx-team/queries";
import { fetchPrDashboard } from "@/adapters/db/pull-requests/queries";
import { getPullRequestsReviewDashboard } from "@/adapters/db/pull-requests-review/queries";
import { getReleasesDashboard } from "@/adapters/db/releases/queries";
import { getTechRadarDashboard } from "@/adapters/db/techradar/queries";
import { getTrackerDashboard } from "@/adapters/db/tracker/queries";
import { getWorkflowDashboard } from "@/adapters/db/workflows/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { ORGANIZATION, REPOSITORIES } from "@/lib/config";
import { sortInsights } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { parseDashboardQuery } from "@/lib/query-params";

/** Dashboards whose insights feed the executive summary. */
const ENDPOINT_LABELS = {
  "dx-adoption": "DX Adoption",
  "dx-team": "DX Team",
  iac: "IaC PRs",
  "pull-requests": "Pull Requests",
  "pull-requests-review": "PR Reviews",
  releases: "DX Releases",
  techradar: "Techradar",
  tracker: "DX Tracker",
  workflows: "Workflows",
} as const;

type EndpointKey = keyof typeof ENDPOINT_LABELS;

const latestReferenceDate = (dates: readonly string[]): null | string =>
  dates.reduce<null | string>((latest, current) => {
    if (latest === null || current > latest) {
      return current;
    }
    return latest;
  }, null);

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  // All nine adapters run concurrently; each failure degrades the summary
  // instead of failing the whole endpoint, so a single broken dashboard still
  // yields the insights of the remaining eight.
  const settled = await Promise.allSettled([
    fetchPrDashboard(db, { days, fullName }),
    getPullRequestsReviewDashboard(db, { days, fullName }),
    getWorkflowDashboard(db, { days, fullName }),
    getIacDashboard(db, { days, fullName }),
    fetchDxAdoption(db, { fullName }),
    getTechRadarDashboard(db, {
      configuredRepositories: REPOSITORIES.map(
        (name) => `${ORGANIZATION}/${name}`,
      ),
    }),
    fetchDxTeamDashboard(db, { days, organization: ORGANIZATION }),
    getTrackerDashboard(db),
    getReleasesDashboard(db),
  ]);

  const insights: Insight[] = [];
  const referenceDates: string[] = [];
  const failed: string[] = [];

  const labels = Object.keys(ENDPOINT_LABELS) as EndpointKey[];

  settled.forEach((result, index) => {
    const label = ENDPOINT_LABELS[labels[index]];

    if (result.status === "rejected") {
      console.error(`Executive summary — ${label} failed:`, result.reason);
      failed.push(label);
      return;
    }

    const { insights: dashboardInsights, meta } = result.value;

    insights.push(
      ...dashboardInsights.map((insight) => ({ ...insight, source: label })),
    );

    const referenceDate = (meta as { referenceDate?: string }).referenceDate;
    if (typeof referenceDate === "string") {
      referenceDates.push(referenceDate);
    }
  });

  if (failed.length === settled.length) {
    console.error("Executive summary error: every dashboard failed");
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  return jsonWithCache({
    insights: sortInsights(insights),
    meta: {
      failed,
      referenceDate: latestReferenceDate(referenceDates),
    },
  });
}
