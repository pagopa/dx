// Pull request dashboard API route — thin adapter delegating to the domain layer.
import { NextRequest, NextResponse } from "next/server";

import { fetchPrDashboard } from "@/adapters/db/pull-requests/queries";
import { db } from "@/db/instance";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    const result = await fetchPrDashboard(db, { days, fullName });
    return NextResponse.json(result);
  } catch (error) {
    console.error("PR dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
