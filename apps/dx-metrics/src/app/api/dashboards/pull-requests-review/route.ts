/** Route handler adapter for the pull-requests-review dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { getPullRequestsReviewDashboard } from "@/adapters/db/pull-requests-review/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";
import { resolveVisibleRepositories } from "@/lib/scope/scope";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, end, start } = parsed.query;
  const fullNames = resolveVisibleRepositories(parsed.query, auth.scope).map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const data = await getPullRequestsReviewDashboard(db, {
      days,
      end,
      fullNames,
      start,
    });
    return jsonWithNoStore(data);
  } catch (error) {
    console.error("PR review dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
