/** Cross-repository benchmark API route, read by `/dashboards/benchmark`. */
import { NextRequest, NextResponse } from "next/server";

import { getBenchmarkDashboard } from "@/adapters/db/benchmark/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { parseDashboardQuery } from "@/lib/query-params";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, end, start } = parsed.query;

  try {
    // The scope is the comparison universe: a narrowed link ranks its
    // repositories against each other, never against the whole portfolio.
    const result = await getBenchmarkDashboard(db, {
      configuredRepositories: [...auth.scope.repositories],
      days,
      end,
      start,
    });
    return jsonWithNoStore(result);
  } catch (error) {
    console.error("Benchmark dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
