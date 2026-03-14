/** Techradar dashboard domain logic — queries and aggregation. */

import { asc, inArray } from "drizzle-orm";

import { techRadarUsages } from "@/db/schema";
import { buildTechRadarDashboardData } from "@/lib/tech-radar-dashboard";

import type { Database } from "../shared/types";
import type { TechRadarDashboardResult, TechRadarParams } from "./types";

/** Fetches tech-radar usages and builds the aggregated dashboard payload. */
export const getTechRadarDashboard = async (
  db: Database,
  { configuredRepositories }: TechRadarParams,
): Promise<TechRadarDashboardResult> => {
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
      inArray(techRadarUsages.repositoryFullName, [...configuredRepositories]),
    )
    .orderBy(
      asc(techRadarUsages.repositoryFullName),
      asc(techRadarUsages.toolName),
    );

  return buildTechRadarDashboardData(rows, configuredRepositories);
};
