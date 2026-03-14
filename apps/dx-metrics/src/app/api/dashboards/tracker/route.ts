/** Next.js route handler (adapter) for the Tracker dashboard. */

import { NextResponse } from "next/server";

import { db } from "@/db/instance";
import { getTrackerDashboard } from "@/domain/tracker/queries";

export async function GET() {
  try {
    const data = await getTrackerDashboard(db);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Tracker dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
