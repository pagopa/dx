/** Next.js route handler adapter for the workflows dashboard. */

import { NextRequest, NextResponse } from "next/server";

import { getWorkflowDashboard } from "@/adapters/db/workflows/queries";
import { db } from "@/db/instance";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    const result = await getWorkflowDashboard(db, { days, fullName });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Workflow dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
