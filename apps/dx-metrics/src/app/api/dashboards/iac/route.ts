/** Next.js route handler for the IaC dashboard — thin adapter over domain logic. */
import { NextRequest, NextResponse } from "next/server";

import { getIacDashboard } from "@/adapters/db/iac/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery, resolveRepositories } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;
  const fullNames = resolveRepositories(parsed.query, "io-infra").map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const result = await getIacDashboard(db, { days, fullNames });
    return jsonWithCache(result);
  } catch (error) {
    console.error("IaC dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
