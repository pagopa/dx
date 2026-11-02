/**
 * Executive-summary API route: aggregates the insights computed by every
 * dashboard adapter into a single payload.
 *
 * Previously `/dashboards/overview` fetched all dashboard endpoints from the
 * browser, each of which ran its full adapter — one HTTP round trip per
 * dashboard plus the full payload of every dashboard just to harvest the
 * `insights` field. Running the adapters server-side in parallel, one request,
 * keeps the same result with a fraction of the round trips and lets the
 * response be cached.
 */
import { NextRequest, NextResponse } from "next/server";

import { getIacDashboard } from "@/adapters/db/iac/queries";
import { getCopilotDashboard } from "@/adapters/db/copilot/queries";
import { fetchDxAdoption } from "@/adapters/db/dx-adoption/queries";
import { fetchDxTeamDashboard } from "@/adapters/db/dx-team/queries";
import { fetchPrDashboard } from "@/adapters/db/pull-requests/queries";
import { getPullRequestsReviewDashboard } from "@/adapters/db/pull-requests-review/queries";
import { getReleasesDashboard } from "@/adapters/db/releases/queries";
import { getTechRadarDashboard } from "@/adapters/db/techradar/queries";
import { getTrackerDashboard } from "@/adapters/db/tracker/queries";
import { getWorkflowDashboard } from "@/adapters/db/workflows/queries";
import { resolveWindow } from "@/adapters/db/shared/window";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { sortInsights } from "@/lib/insights/insight-helpers";
import type { Insight, WithInsights } from "@/lib/insights/types";
import { parseDashboardQuery } from "@/lib/query-params";
import { resolveVisibleRepositories } from "@/lib/scope/scope";
import { requireScope } from "@/lib/scope/server";

/** Dashboards whose insights feed the executive summary. */
const ENDPOINT_LABELS = {
  copilot: "Copilot",
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

/** Metadata fields the summary aggregates across the source dashboards. */
interface SourceMeta {
  availableFrom?: string;
  availableTo?: string;
  referenceDate?: string;
}

const readSourceMeta = (value: unknown): SourceMeta =>
  typeof value === "object" && value !== null ? (value as SourceMeta) : {};

const earliestDate = (dates: readonly string[]): null | string =>
  dates.reduce<null | string>((earliest, current) => {
    if (earliest === null || current < earliest) {
      return current;
    }
    return earliest;
  }, null);

export async function GET(req: NextRequest) {
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, end, start } = parsed.query;
  const fullNames = resolveVisibleRepositories(parsed.query, auth.scope).map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  // Every adapter runs concurrently; each failure degrades the summary instead
  // of failing the whole endpoint, so a single broken dashboard still yields
  // the insights of the others. Each promise is bound to its key so the settled
  // result cannot be paired with the wrong label.
  const dashboardRequests: readonly {
    key: EndpointKey;
    request: Promise<WithInsights & { meta?: unknown }>;
  }[] = [
    {
      key: "pull-requests",
      request: fetchPrDashboard(db, { days, end, fullNames, start }),
    },
    {
      key: "pull-requests-review",
      request: getPullRequestsReviewDashboard(db, {
        days,
        end,
        fullNames,
        start,
      }),
    },
    {
      key: "copilot",
      request: getCopilotDashboard(db, { days, end, fullNames, start }),
    },
    {
      key: "workflows",
      request: getWorkflowDashboard(db, { days, end, fullNames, start }),
    },
    {
      key: "iac",
      request: getIacDashboard(db, { days, end, fullNames, start }),
    },
    { key: "dx-adoption", request: fetchDxAdoption(db, { fullNames }) },
    {
      key: "techradar",
      request: getTechRadarDashboard(db, {
        configuredRepositories: auth.scope.repositories.map(
          (name) => `${ORGANIZATION}/${name}`,
        ),
        includeUsageTrend: auth.scope.all,
      }),
    },
    // DX Team is organisation-wide and refuses a narrowed scope; asking for it
    // would only add a failed dashboard to the summary.
    ...(auth.scope.all
      ? [
          {
            key: "dx-team" as const,
            request: fetchDxTeamDashboard(db, {
              days,
              end,
              organization: ORGANIZATION,
              start,
            }),
          },
        ]
      : []),
    { key: "tracker", request: getTrackerDashboard(db) },
    { key: "releases", request: getReleasesDashboard(db) },
  ];

  const settled = await Promise.allSettled(
    dashboardRequests.map((entry) => entry.request),
  );

  const insights: Insight[] = [];
  const referenceDates: string[] = [];
  const availableFroms: string[] = [];
  const availableTos: string[] = [];
  const failed: string[] = [];

  settled.forEach((result, index) => {
    const label = ENDPOINT_LABELS[dashboardRequests[index].key];

    if (result.status === "rejected") {
      console.error(`Executive summary — ${label} failed:`, result.reason);
      failed.push(label);
      return;
    }

    const { insights: dashboardInsights, meta } = result.value;

    insights.push(
      ...dashboardInsights.map((insight) => ({ ...insight, source: label })),
    );

    const sourceMeta = readSourceMeta(meta);
    if (typeof sourceMeta.referenceDate === "string") {
      referenceDates.push(sourceMeta.referenceDate);
    }
    if (typeof sourceMeta.availableFrom === "string") {
      availableFroms.push(sourceMeta.availableFrom);
    }
    if (typeof sourceMeta.availableTo === "string") {
      availableTos.push(sourceMeta.availableTo);
    }
  });

  if (failed.length === settled.length) {
    console.error("Executive summary error: every dashboard failed");
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // The summary spans dashboards with different data ranges. The selectable
  // range is their union, resolved with the same rules each adapter uses, so the
  // filter shows one coherent interval even though some sources start later.
  const unionFrom = earliestDate(availableFroms);
  const unionTo = latestReferenceDate(availableTos);
  const window =
    unionFrom !== null && unionTo !== null
      ? resolveWindow({
          availableFrom: unionFrom,
          availableTo: unionTo,
          days,
          end,
          start,
        })
      : null;

  return jsonWithNoStore({
    insights: sortInsights(insights),
    meta: {
      // Lets the summary say "N of M" without hard-coding the dashboard count.
      dashboardCount: settled.length,
      failed,
      referenceDate: latestReferenceDate(referenceDates),
      ...(window === null
        ? {}
        : {
            availableFrom: window.availableFrom,
            availableTo: window.availableTo,
            days: window.days,
            windowEnd: window.windowEnd,
            windowStart: window.windowStart,
          }),
    },
  });
}
