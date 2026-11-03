/** Route handler adapter for the DX Team dashboard. */
import { NextRequest, NextResponse } from "next/server";

import { fetchDxTeamDashboard } from "@/adapters/db/dx-team/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";
import { requireFullScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  const auth = requireFullScope(req);
  if ("error" in auth) return auth.error;

  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, end, start } = parsed.query;

  try {
    const result = await fetchDxTeamDashboard(db, {
      days,
      end,
      organization: ORGANIZATION,
      start,
    });
    return jsonWithNoStore(result);
  } catch (error) {
    console.error("DX Team dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
