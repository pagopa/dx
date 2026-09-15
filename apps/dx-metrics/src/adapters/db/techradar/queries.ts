/** Techradar dashboard domain logic — queries and aggregation. */

import { asc, inArray } from "drizzle-orm";

import {
  techRadarSnapshots,
  techRadarUsages,
} from "@pagopa/dx-metrics-core/schema";
import { buildTechRadarInsights } from "@/lib/insights/techradar";
import type { WithInsights } from "@/lib/insights/types";
import { buildTechRadarDashboardData } from "@/lib/tech-radar-dashboard";

import type { Database, WithMeta } from "../shared/types";
import type {
  GetTechRadarDashboardInput,
  TechRadarDashboardResult,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { parseSqlRows } from "../shared/sql-parsing";
import {
  techRadarDashboardResultSchema,
  techRadarUsageTrendRowSchema,
  type TechRadarUsageTrendRow,
} from "./schemas";

/** Fetches tech-radar usages and builds the aggregated dashboard payload. */
export const getTechRadarDashboard = async (
  db: Database,
  { configuredRepositories }: GetTechRadarDashboardInput,
): Promise<
  TechRadarDashboardResult &
    WithInsights &
    WithMeta & { usageTrend: TechRadarUsageTrendRow[] }
> => {
  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({
      from: "tech_radar_usages",
      column: "detected_at",
    }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "techradar referenceDate",
  );

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

  const usageTrendRows = await db
    .select({
      capturedAt: techRadarSnapshots.capturedAt,
      radarRing: techRadarSnapshots.radarRing,
      radarStatus: techRadarSnapshots.radarStatus,
      repositoryCount: techRadarSnapshots.repositoryCount,
      toolKey: techRadarSnapshots.toolKey,
      toolName: techRadarSnapshots.toolName,
    })
    .from(techRadarSnapshots)
    .orderBy(
      asc(techRadarSnapshots.capturedAt),
      asc(techRadarSnapshots.toolKey),
    );

  const usageTrend = parseSqlRows(
    techRadarUsageTrendRowSchema,
    usageTrendRows,
    "techradar usageTrend",
  );

  const dashboard = techRadarDashboardResultSchema.parse(
    buildTechRadarDashboardData(rows, configuredRepositories),
  );

  return {
    ...dashboard,
    insights: buildTechRadarInsights({ ...dashboard, usageTrend }),
    meta: { referenceDate },
    usageTrend,
  };
};
