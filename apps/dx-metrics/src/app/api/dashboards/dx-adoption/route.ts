/** Route handler for the DX Adoption dashboard (thin adapter). */
import { NextRequest, NextResponse } from "next/server";

import { fetchDxAdoption } from "@/adapters/db/dx-adoption/queries";
import { db } from "@/db/instance";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    const result = await fetchDxAdoption(db, { fullName });
    return NextResponse.json(result);
  } catch (error) {
    console.error("DX Adoption dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
