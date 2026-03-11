/** This module serves the aggregated Techradar dashboard payload. */

import { asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { techRadarUsages } from "@/db/schema";
import { ORGANIZATION, REPOSITORIES } from "@/lib/config";
import { buildTechRadarDashboardData } from "@/lib/tech-radar-dashboard";

export async function GET() {
  const configuredRepositories = REPOSITORIES.map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const rows = await db
      .select({
        evidencePath: techRadarUsages.evidencePath,
        radarRef: techRadarUsages.radarRef,
        radarRing: techRadarUsages.radarRing,
        radarSlug: techRadarUsages.radarSlug,
        radarStatus: techRadarUsages.radarStatus,
        radarTitle: techRadarUsages.radarTitle,
        repositoryFullName: techRadarUsages.repositoryFullName,
        toolKey: techRadarUsages.toolKey,
        toolName: techRadarUsages.toolName,
      })
      .from(techRadarUsages)
      .where(
        inArray(techRadarUsages.repositoryFullName, configuredRepositories),
      )
      .orderBy(
        asc(techRadarUsages.repositoryFullName),
        asc(techRadarUsages.toolName),
      );

    return NextResponse.json(
      buildTechRadarDashboardData(rows, configuredRepositories),
    );
  } catch (error) {
    console.error("Techradar dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
