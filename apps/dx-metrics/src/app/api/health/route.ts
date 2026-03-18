/** Health check endpoint — verifies the app process and database connectivity. */

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/instance";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 },
    );
  }
}
