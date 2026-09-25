/** IaC dashboard SQL queries and data transformation logic. */

import { sql, type SQL } from "drizzle-orm";

import { buildIacInsights } from "@/lib/insights/iac";
import type { WithInsights } from "@/lib/insights/types";
import { IAC_EXCLUDED_PR_TITLES } from "@/lib/config";

import type { Database, WithMeta } from "../shared/types";
import type { GetIacDashboardInput, IacDashboardResult } from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { notInValues, repositoryIn } from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import { percentileRowSchema } from "../shared/schemas";
import { buildMemberMatchSql } from "./member-match-sql";
import {
  dxMemberRowSchema,
  leadTimeMovingAvgRowSchema,
  leadTimeTrendRowSchema,
  prsByReviewerRowSchema,
  prsOverTimeRowSchema,
  supervisedVsUnsupervisedRowSchema,
} from "./schemas";

/**
 * Excludes release-automation PRs (e.g. "Version Packages") from IaC metrics.
 * Takes a qualified column so the same exclusion can be applied to both the
 * `iac_pr_lead_times` scan and the `pull_requests` join (`ipr.title`).
 */
const iacTitleFilter = (column: string): SQL =>
  notInValues(column, IAC_EXCLUDED_PR_TITLES);

/**
 * Resolves the latest data point date for the given repository.
 * All time-window filters are relative to this reference date.
 */
const getReferenceDate = async (
  db: Database,
  fullNames: readonly string[],
): Promise<string> => {
  const result = await db.execute(
    buildReferenceDateQuery({
      column: "GREATEST(created_at, merged_at)",
      from: "iac_pr_lead_times",
      where: repositoryIn("repository_full_name", fullNames),
    }),
  );
  return parseReferenceDate(result.rows[0], "iac referenceDate");
};

/** Fetches the list of DX team member usernames. */
const getDxMembers = async (db: Database): Promise<readonly string[]> => {
  const result = await db.execute(sql`
    SELECT username FROM dx_team_members
  `);
  return parseSqlRows(dxMemberRowSchema, result.rows, "iac dxMembers").map(
    (row) => row.username,
  );
};

/** IaC PR Lead Time — weekly average. */
const queryLeadTimeMovingAvg = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    SELECT DATE_TRUNC('week', merged_at)::date AS week,
      ROUND(AVG(EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400)::numeric, 2) AS "avgLeadTimeDays"
    FROM iac_pr_lead_times
    WHERE ${repositoryIn("repository_full_name", fullNames)}
      AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND created_at IS NOT NULL AND merged_at IS NOT NULL
      AND ${iacTitleFilter("title")}
    GROUP BY DATE_TRUNC('week', merged_at)::date
    ORDER BY week
  `);

/** IaC PR Lead Time — linear regression trend line. */
const queryLeadTimeTrend = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    WITH pr_lead_times AS (
        SELECT created_at::date AS "createdDate",
          EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400 AS "leadTimeDays",
          ROW_NUMBER() OVER (ORDER BY created_at::date) AS x
      FROM iac_pr_lead_times
      WHERE ${repositoryIn("repository_full_name", fullNames)}
        AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND created_at IS NOT NULL AND merged_at IS NOT NULL
        AND ${iacTitleFilter("title")}
    ),
    stats AS (SELECT COUNT(*) AS n, AVG(x) AS "xAvg", AVG("leadTimeDays") AS "yAvg" FROM pr_lead_times),
    regression AS (
      SELECT CASE WHEN SUM(POWER(p.x - s."xAvg", 2)) != 0
        THEN SUM((p.x - s."xAvg") * (p."leadTimeDays" - s."yAvg")) / SUM(POWER(p.x - s."xAvg", 2))
        ELSE 0 END AS slope, s."yAvg", s."xAvg"
      FROM pr_lead_times p CROSS JOIN stats s GROUP BY s."xAvg", s."yAvg"
    )
    SELECT p."createdDate" AS date,
      GREATEST(ROUND((r.slope * p.x + (r."yAvg" - r.slope * r."xAvg"))::numeric, 2), 0) AS "trendLine"
    FROM pr_lead_times p CROSS JOIN regression r ORDER BY p."createdDate"
  `);

/** IaC PR lead-time distribution percentiles. */
const queryLeadTimePercentiles = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    SELECT
      COUNT(*) AS "count",
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400
      )::numeric, 2) AS "p50",
      ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400
      )::numeric, 2) AS "p85",
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400
      )::numeric, 2) AS "p95"
    FROM iac_pr_lead_times
    WHERE ${repositoryIn("repository_full_name", fullNames)}
      AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND created_at IS NOT NULL AND merged_at IS NOT NULL
      AND ${iacTitleFilter("title")}
  `);

/**
 * Supervised vs Unsupervised IaC PRs — cumulative counts.
 * A PR is "supervised" when authored by a DX team member OR merged/reviewed by one.
 */
const querySupervisedVsUnsupervised = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
  dxMembers: readonly string[],
) =>
  db.execute(sql`
    WITH classified AS (
      SELECT ipr.created_at::date AS "runDate",
        CASE WHEN ${buildMemberMatchSql("ipr.author", dxMembers)}
                  OR ${buildMemberMatchSql("pr.merged_by", dxMembers)}
             THEN 'Supervised PRs'
             ELSE 'Unsupervised PRs' END AS "prType"
      FROM iac_pr_lead_times ipr
      LEFT JOIN pull_requests pr ON pr.repository_id = ipr.repository_id AND pr.number = ipr.pr_number
      WHERE ${repositoryIn("ipr.repository_full_name", fullNames)}
        AND ipr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ipr.created_at IS NOT NULL AND ${iacTitleFilter("ipr.title")}
        AND (pr.draft IS NULL OR pr.draft = 0)
    )
    SELECT "runDate", "prType",
      SUM("dailyCount") OVER (PARTITION BY "prType" ORDER BY "runDate") AS "cumulativeCount"
    FROM (
      SELECT "runDate", "prType", COUNT(*) AS "dailyCount"
      FROM classified
      GROUP BY "runDate", "prType"
    ) daily_counts ORDER BY "runDate", "prType"
  `);

/** IaC PRs Count Over Time — weekly buckets. */
const queryPrsOverTime = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    SELECT DATE_TRUNC('week', created_at)::date AS week,
      COUNT(*) AS "prCount"
    FROM iac_pr_lead_times
    WHERE ${repositoryIn("repository_full_name", fullNames)}
      AND created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND created_at IS NOT NULL AND ${iacTitleFilter("title")}
    GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY week
  `);

/** IaC PRs by DX team member — authored or reviewed/merged. */
const queryPrsByReviewer = (
  db: Database,
  fullNames: readonly string[],
  maxDate: string,
  days: number,
  dxMembers: readonly string[],
) =>
  db.execute(sql`
    WITH base AS (
      SELECT DISTINCT ipr.repository_full_name, ipr.pr_number, ipr.author, ipr.created_at, ipr.merged_at, pr.merged_by
      FROM iac_pr_lead_times ipr
      LEFT JOIN pull_requests pr ON pr.repository_id = ipr.repository_id AND pr.number = ipr.pr_number
      WHERE ${repositoryIn("ipr.repository_full_name", fullNames)}
        AND ipr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ipr.created_at IS NOT NULL AND ${iacTitleFilter("ipr.title")}
    ),
    expanded AS (
      SELECT repository_full_name, pr_number, created_at, merged_at,
        UNNEST(ARRAY[
          CASE WHEN ${buildMemberMatchSql("author", dxMembers)} THEN author END,
          CASE WHEN ${buildMemberMatchSql("merged_by", dxMembers)} AND merged_by != author THEN merged_by END
        ]) AS member
      FROM base
    )
      SELECT member AS reviewer,
      COUNT(*) AS "totalPrs",
      COUNT(*) FILTER (WHERE merged_at IS NOT NULL) AS "mergedPrs",
      ROUND(AVG(CASE WHEN merged_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400 END)::numeric, 2) AS "avgLeadTimeDays"
    FROM expanded
    WHERE member IS NOT NULL
    GROUP BY member ORDER BY "totalPrs" DESC
  `);

/** Fetches all IaC dashboard data for the given repository and time window. */
export const getIacDashboard = async (
  db: Database,
  params: GetIacDashboardInput,
): Promise<IacDashboardResult & WithInsights & WithMeta> => {
  const { days, fullNames } = params;

  const referenceDate = await getReferenceDate(db, fullNames);
  const dxMembers = await getDxMembers(db);

  const [
    leadTimeMovingAvg,
    leadTimePercentiles,
    leadTimeTrend,
    supervisedVsUnsupervised,
    prsOverTime,
    prsByReviewer,
  ] = await Promise.all([
    queryLeadTimeMovingAvg(db, fullNames, referenceDate, days),
    queryLeadTimePercentiles(db, fullNames, referenceDate, days),
    queryLeadTimeTrend(db, fullNames, referenceDate, days),
    querySupervisedVsUnsupervised(
      db,
      fullNames,
      referenceDate,
      days,
      dxMembers,
    ),
    queryPrsOverTime(db, fullNames, referenceDate, days),
    queryPrsByReviewer(db, fullNames, referenceDate, days, dxMembers),
  ]);

  const dashboard = {
    leadTimeMovingAvg: parseSqlRows(
      leadTimeMovingAvgRowSchema,
      leadTimeMovingAvg.rows,
      "iac leadTimeMovingAvg",
    ),
    leadTimePercentiles: parseSqlRow(
      percentileRowSchema,
      leadTimePercentiles.rows[0],
      "iac leadTimePercentiles",
    ),
    leadTimeTrend: parseSqlRows(
      leadTimeTrendRowSchema,
      leadTimeTrend.rows,
      "iac leadTimeTrend",
    ),
    prsByReviewer: parseSqlRows(
      prsByReviewerRowSchema,
      prsByReviewer.rows,
      "iac prsByReviewer",
    ),
    prsOverTime: parseSqlRows(
      prsOverTimeRowSchema,
      prsOverTime.rows,
      "iac prsOverTime",
    ),
    supervisedVsUnsupervised: parseSqlRows(
      supervisedVsUnsupervisedRowSchema,
      supervisedVsUnsupervised.rows,
      "iac supervisedVsUnsupervised",
    ),
  };

  return {
    ...dashboard,
    insights: buildIacInsights(dashboard),
    meta: { days, referenceDate },
  };
};
