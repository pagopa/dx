/** Cross-repository contributors & ownership API route. */
import { NextRequest, NextResponse } from "next/server";

import { getContributorsDashboard } from "@/adapters/db/contributors/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { resolveDashboardRepositories } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository } = parsed.query;

  // Every configured repository contributes by default; a `repository` value
  // narrows the view to one, and the `all` sentinel widens it back.
  const repositories = resolveDashboardRepositories(repository);

  try {
    const result = await getContributorsDashboard(db, { days, repositories });
    return jsonWithCache(result);
  } catch (error) {
    console.error("Contributors dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
