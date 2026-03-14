/** Next.js route handler for the IaC dashboard — thin adapter over domain logic. */
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/instance";
import { getIacDashboard } from "@/domain/iac/queries";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "io-infra" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    const result = await getIacDashboard(db, { days, fullName });
    return NextResponse.json(result);
  } catch (error) {
    console.error("IaC dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
