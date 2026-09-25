/** Route handler adapter for the pull-requests-review dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { getPullRequestsReviewDashboard } from "@/adapters/db/pull-requests-review/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery, resolveRepositories } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;
  const fullNames = resolveRepositories(parsed.query, "dx").map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const data = await getPullRequestsReviewDashboard(db, { days, fullNames });
    return jsonWithCache(data);
  } catch (error) {
    console.error("PR review dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
