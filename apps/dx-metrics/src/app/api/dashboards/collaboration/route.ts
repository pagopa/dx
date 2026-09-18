/** Cross-repository collaboration API route, read by `/dashboards/collaboration`. */
import { NextRequest, NextResponse } from "next/server";

import { getCollaborationDashboard } from "@/adapters/db/collaboration/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { resolveDashboardRepositories } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  // Aggregates every configured repository by default; a `repository` value
  // narrows it to one, and the `all` sentinel widens it back.
  const { days, repository } = parsed.query;
  const repositories = resolveDashboardRepositories(repository);

  try {
    const result = await getCollaborationDashboard(db, { days, repositories });
    return jsonWithCache(result);
  } catch (error) {
    console.error("Collaboration dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
