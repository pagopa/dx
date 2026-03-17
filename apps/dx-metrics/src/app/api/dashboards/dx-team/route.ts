/** Route handler adapter for the DX Team dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { fetchDxTeamDashboard } from "@/adapters/db/dx-team/queries";
import { db } from "@/db/instance";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;

  try {
    const result = await fetchDxTeamDashboard(db, {
      days,
      organization: ORGANIZATION,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("DX Team dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
