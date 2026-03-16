/** Route handler adapter for the pull-requests-review dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { getPullRequestsReviewDashboard } from "@/adapters/db/pull-requests-review/queries";
import { db } from "@/db/instance";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    const data = await getPullRequestsReviewDashboard(db, { days, fullName });
    return NextResponse.json(data);
  } catch (error) {
    console.error("PR review dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
