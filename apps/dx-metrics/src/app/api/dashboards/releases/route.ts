/** Route handler adapter for the releases dashboard. */
import { NextResponse } from "next/server";

import { getReleasesDashboard } from "@/adapters/db/releases/queries";
import { db } from "@/db/instance";

export async function GET() {
  try {
    const data = await getReleasesDashboard(db);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
