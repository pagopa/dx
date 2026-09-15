// Cross-repository overview API route — thin adapter over the benchmark query.
import { NextRequest, NextResponse } from "next/server";

import { getOverviewDashboard } from "@/adapters/db/overview/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { REPOSITORIES } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;

  try {
    const result = await getOverviewDashboard(db, {
      configuredRepositories: REPOSITORIES,
      days,
    });
    return jsonWithCache(result);
  } catch (error) {
    console.error("Overview dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
