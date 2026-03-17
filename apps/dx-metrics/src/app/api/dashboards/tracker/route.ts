/** Next.js route handler (adapter) for the Tracker dashboard. */

import { NextResponse } from "next/server";

import { getTrackerDashboard } from "@/adapters/db/tracker/queries";
import { db } from "@/db/instance";

export async function GET() {
  try {
    const data = await getTrackerDashboard(db);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Tracker dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
