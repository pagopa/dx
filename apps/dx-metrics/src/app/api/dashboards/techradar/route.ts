/** Route adapter — serves the aggregated Techradar dashboard payload. */

import { NextResponse } from "next/server";

import { getTechRadarDashboard } from "@/adapters/db/techradar/queries";
import { db } from "@/db/instance";
import { ORGANIZATION, REPOSITORIES } from "@/lib/config";

export async function GET() {
  const configuredRepositories = REPOSITORIES.map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const data = await getTechRadarDashboard(db, { configuredRepositories });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Techradar dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
