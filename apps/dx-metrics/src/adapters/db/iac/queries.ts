/** IaC dashboard SQL queries and data transformation logic. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type { GetIacDashboardInput, IacDashboardResult } from "./schemas";

import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import { buildMemberMatchSql } from "./member-match-sql";
import {
  dxMemberRowSchema,
  leadTimeMovingAvgRowSchema,
  leadTimeTrendRowSchema,
  maxDateRowSchema,
  prsByReviewerRowSchema,
  prsOverTimeRowSchema,
  supervisedVsUnsupervisedRowSchema,
} from "./schemas";

/**
 * Resolves the latest data point date for the given repository.
 * All time-window filters are relative to this reference date.
 */
const getMaxDate = async (db: Database, fullName: string): Promise<string> => {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(GREATEST(created_at, merged_at)), NOW()) AS "maxDate"
    FROM iac_pr_lead_times
    WHERE repository_full_name = ${fullName}
  `);
  return parseSqlRow(maxDateRowSchema, result.rows[0], "iac maxDate").maxDate;
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
  fullName: string,
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    SELECT DATE_TRUNC('week', merged_at)::date AS week,
      ROUND(AVG(EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400)::numeric, 2) AS "avgLeadTimeDays"
    FROM iac_pr_lead_times
    WHERE repository_full_name = ${fullName}
      AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND created_at IS NOT NULL AND merged_at IS NOT NULL
      AND title != 'Version Packages'
    GROUP BY DATE_TRUNC('week', merged_at)::date
    ORDER BY week
  `);

/** IaC PR Lead Time — linear regression trend line. */
const queryLeadTimeTrend = (
  db: Database,
  fullName: string,
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    WITH pr_lead_times AS (
        SELECT created_at::date AS "createdDate",
          EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400 AS "leadTimeDays",
          ROW_NUMBER() OVER (ORDER BY created_at::date) AS x
      FROM iac_pr_lead_times
      WHERE repository_full_name = ${fullName}
        AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND created_at IS NOT NULL AND merged_at IS NOT NULL
        AND title != 'Version Packages'
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

/**
 * Supervised vs Unsupervised IaC PRs — cumulative counts.
 * A PR is "supervised" when authored by a DX team member OR merged/reviewed by one.
 */
const querySupervisedVsUnsupervised = (
  db: Database,
  fullName: string,
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
      WHERE ipr.repository_full_name = ${fullName}
        AND ipr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ipr.created_at IS NOT NULL AND ipr.title != 'Version Packages'
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
  fullName: string,
  maxDate: string,
  days: number,
) =>
  db.execute(sql`
    SELECT DATE_TRUNC('week', created_at)::date AS week,
      COUNT(*) AS "prCount"
    FROM iac_pr_lead_times
    WHERE repository_full_name = ${fullName}
      AND created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND created_at IS NOT NULL AND title != 'Version Packages'
    GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY week
  `);

/** IaC PRs by DX team member — authored or reviewed/merged. */
const queryPrsByReviewer = (
  db: Database,
  fullName: string,
  maxDate: string,
  days: number,
  dxMembers: readonly string[],
) =>
  db.execute(sql`
    WITH base AS (
      SELECT DISTINCT ipr.pr_number, ipr.author, ipr.created_at, ipr.merged_at, pr.merged_by
      FROM iac_pr_lead_times ipr
      LEFT JOIN pull_requests pr ON pr.repository_id = ipr.repository_id AND pr.number = ipr.pr_number
      WHERE ipr.repository_full_name = ${fullName}
        AND ipr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ipr.created_at IS NOT NULL AND ipr.title != 'Version Packages'
    ),
    expanded AS (
      SELECT pr_number, created_at, merged_at,
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
): Promise<IacDashboardResult> => {
  const { days, fullName } = params;

  const maxDate = await getMaxDate(db, fullName);
  const dxMembers = await getDxMembers(db);

  const [
    leadTimeMovingAvg,
    leadTimeTrend,
    supervisedVsUnsupervised,
    prsOverTime,
    prsByReviewer,
  ] = await Promise.all([
    queryLeadTimeMovingAvg(db, fullName, maxDate, days),
    queryLeadTimeTrend(db, fullName, maxDate, days),
    querySupervisedVsUnsupervised(db, fullName, maxDate, days, dxMembers),
    queryPrsOverTime(db, fullName, maxDate, days),
    queryPrsByReviewer(db, fullName, maxDate, days, dxMembers),
  ]);

  return {
    leadTimeMovingAvg: parseSqlRows(
      leadTimeMovingAvgRowSchema,
      leadTimeMovingAvg.rows,
      "iac leadTimeMovingAvg",
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
};
