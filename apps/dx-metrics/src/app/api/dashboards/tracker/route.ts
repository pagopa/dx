/** Next.js route handler (adapter) for the Tracker dashboard. */

import { NextRequest, NextResponse } from "next/server";

import { getTrackerDashboard } from "@/adapters/db/tracker/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  // No repository dimension: any valid scope sees the same payload. It still
  // requires one, because no data is served without a link.
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  try {
    const data = await getTrackerDashboard(db);
    return jsonWithNoStore(data);
  } catch (error) {
    console.error("Tracker dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
