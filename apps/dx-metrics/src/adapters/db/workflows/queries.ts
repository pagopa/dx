/** SQL queries and data transformation for the workflows dashboard. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type {
  GetWorkflowDashboardInput,
  WorkflowDashboardResult,
} from "./schemas";

import {
  parseOptionalSqlRow,
  parseSqlRow,
  parseSqlRows,
} from "../shared/sql-parsing";
import {
  maxDateRowSchema,
  workflowAvgDurationSchema,
  workflowCumulativeDurationSchema,
  workflowDeploymentSchema,
  workflowDxVsNonDxSchema,
  workflowFailureSchema,
  workflowInfraDurationSchema,
  workflowRunCountSchema,
  workflowSuccessRatioSchema,
  workflowSummarySchema,
} from "./schemas";

/** Fetch all workflow dashboard data for the given repository and time window. */
export const getWorkflowDashboard = async (
  db: Database,
  params: GetWorkflowDashboardInput,
): Promise<WorkflowDashboardResult> => {
  const { days, fullName } = params;

  const maxDate = await fetchMaxDate(db, fullName);

  const [
    deployments,
    dxVsNonDx,
    failures,
    avgDuration,
    runCount,
    cumulativeDuration,
    infraPlan,
    infraApply,
    successRatio,
    summaryResult,
  ] = await Promise.all([
    fetchDeployments(db, fullName, days, maxDate),
    fetchDxVsNonDx(db, fullName, days, maxDate),
    fetchFailures(db, fullName, days, maxDate),
    fetchAvgDuration(db, fullName, days, maxDate),
    fetchRunCount(db, fullName, days, maxDate),
    fetchCumulativeDuration(db, fullName, days, maxDate),
    fetchInfraPlan(db, fullName, days, maxDate),
    fetchInfraApply(db, fullName, days, maxDate),
    fetchSuccessRatio(db, fullName, days, maxDate),
    fetchSummary(db, fullName, days, maxDate),
  ]);

  return {
    avgDuration,
    cumulativeDuration,
    deployments,
    dxVsNonDx,
    failures,
    infraApply,
    infraPlan,
    runCount,
    successRatio,
    summary: summaryResult,
  };
};

const fetchMaxDate = async (db: Database, fullName: string) => {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(wr.created_at), NOW()) AS "maxDate"
    FROM workflow_runs wr
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
  `);
  return (
    parseSqlRow(maxDateRowSchema, result.rows[0], "workflows maxDate")
      .maxDate ?? new Date().toISOString()
  );
};

const fetchDeployments = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT DATE_TRUNC('week', wr.created_at) AS "runWeek",
      COUNT(*) AS "weeklyDeploymentCount"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND (LOWER(w.name) LIKE '%deploy%' OR LOWER(w.name) LIKE '%delivery%'
           OR LOWER(w.name) LIKE '%release%' OR LOWER(w.name) LIKE '%apply%')
      AND TRIM(wr.conclusion) = 'success'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name != 'Labeler'
    GROUP BY DATE_TRUNC('week', wr.created_at) ORDER BY "runWeek"
  `);
  return parseSqlRows(
    workflowDeploymentSchema,
    r.rows,
    "workflows deployments",
  );
};

const fetchDxVsNonDx = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT "runDate", "pipelineType",
      SUM("dailyCount") OVER (PARTITION BY "pipelineType" ORDER BY "runDate") AS "cumulativeCount"
    FROM (
      SELECT wr.created_at::date AS "runDate",
        CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END AS "pipelineType",
        COUNT(*) AS "dailyCount"
      FROM workflow_runs wr
      JOIN workflows w ON wr.workflow_id = w.id
      JOIN repositories r ON wr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND w.name NOT IN ('CodeQL', 'Labeler')
      GROUP BY wr.created_at::date,
        CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END
    ) daily_counts ORDER BY "runDate", "pipelineType"
  `);
  return parseSqlRows(workflowDxVsNonDxSchema, r.rows, "workflows dxVsNonDx");
};

const fetchFailures = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS "workflowName",
      COUNT(*) AS "failedRuns"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) = 'failure'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY "workflowName" ORDER BY "workflowName"
  `);
  return parseSqlRows(workflowFailureSchema, r.rows, "workflows failures");
};

const fetchAvgDuration = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS "workflowName",
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "averageDurationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY "workflowName" ORDER BY "workflowName"
  `);
  return parseSqlRows(
    workflowAvgDurationSchema,
    r.rows,
    "workflows avgDuration",
  );
};

const fetchRunCount = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS "workflowName",
      COUNT(*) AS "runCount"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY "workflowName" ORDER BY "workflowName"
  `);
  return parseSqlRows(workflowRunCountSchema, r.rows, "workflows runCount");
};

const fetchCumulativeDuration = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS "workflowName",
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "cumulativeDurationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY "workflowName" ORDER BY "workflowName"
  `);
  return parseSqlRows(
    workflowCumulativeDurationSchema,
    r.rows,
    "workflows cumulativeDuration",
  );
};

const fetchInfraPlan = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT wr.created_at AS "runTimestamp",
      EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60 AS "durationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND w.pipeline LIKE '%infra_plan.yaml%' AND w.name != 'Labeler'
    ORDER BY "runTimestamp"
  `);
  return parseSqlRows(
    workflowInfraDurationSchema,
    r.rows,
    "workflows infraPlan",
  );
};

const fetchInfraApply = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT wr.created_at AS "runTimestamp",
      EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60 AS "durationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND w.pipeline LIKE '%infra_apply.yaml%' AND w.name != 'Labeler'
    ORDER BY "runTimestamp"
  `);
  return parseSqlRows(
    workflowInfraDurationSchema,
    r.rows,
    "workflows infraApply",
  );
};

const fetchSuccessRatio = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT w.name AS "workflowName", COUNT(*) AS "totalRuns",
      SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END) AS "successfulRuns",
      SUM(CASE WHEN TRIM(wr.conclusion) = 'failure' THEN 1 ELSE 0 END) AS "failedRuns",
      ROUND((SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 2) AS "successRatePercentage"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) IN ('success', 'failure')
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY w.name ORDER BY "totalRuns" DESC
  `);
  return parseSqlRows(
    workflowSuccessRatioSchema,
    r.rows,
    "workflows successRatio",
  );
};

const fetchSummary = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT
      COUNT(*)::int AS "totalPipelines",
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "avgDurationMinutes",
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "totalDurationMinutes",
      MIN(wr.created_at) AS "firstPipelineDate"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
  `);
  return parseOptionalSqlRow(
    workflowSummarySchema,
    r.rows[0],
    "workflows summary",
  );
};
