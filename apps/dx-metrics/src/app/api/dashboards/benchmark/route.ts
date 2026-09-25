/** Cross-repository benchmark API route, read by `/dashboards/benchmark`. */
import { NextRequest, NextResponse } from "next/server";

import { getBenchmarkDashboard } from "@/adapters/db/benchmark/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { REPOSITORIES } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;

  try {
    const result = await getBenchmarkDashboard(db, {
      configuredRepositories: REPOSITORIES,
      days,
    });
    return jsonWithCache(result);
  } catch (error) {
    console.error("Benchmark dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
