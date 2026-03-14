/** SQL queries and data transformation for the workflows dashboard. */

import { sql } from "drizzle-orm";

import type { DashboardParams, Database } from "@/domain/shared/types";

import { coerceNumbers } from "@/domain/shared/numeric";

import type { WorkflowDashboardResult, WorkflowSummary } from "./types";

/** Fetch all workflow dashboard data for the given repository and time window. */
export const getWorkflowDashboard = async (
  db: Database,
  params: DashboardParams,
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
    avgDuration: coerceNumbers(avgDuration),
    cumulativeDuration: coerceNumbers(cumulativeDuration),
    deployments: coerceNumbers(deployments),
    dxVsNonDx: coerceNumbers(dxVsNonDx),
    failures: coerceNumbers(failures),
    infraApply: coerceNumbers(infraApply),
    infraPlan: coerceNumbers(infraPlan),
    runCount: coerceNumbers(runCount),
    successRatio: coerceNumbers(successRatio),
    summary: summaryResult as unknown as undefined | WorkflowSummary,
  };
};

const fetchMaxDate = async (db: Database, fullName: string) => {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(wr.created_at), NOW()) AS max_date
    FROM workflow_runs wr
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
  `);
  return (
    (result.rows[0] as undefined | { max_date: string })?.max_date ??
    new Date().toISOString()
  );
};

const fetchDeployments = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT DATE_TRUNC('week', wr.created_at) AS run_week,
      COUNT(*) AS weekly_deployment_count
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND (LOWER(w.name) LIKE '%deploy%' OR LOWER(w.name) LIKE '%delivery%'
           OR LOWER(w.name) LIKE '%release%' OR LOWER(w.name) LIKE '%apply%')
      AND TRIM(wr.conclusion) = 'success'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name != 'Labeler'
    GROUP BY DATE_TRUNC('week', wr.created_at) ORDER BY run_week
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchDxVsNonDx = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT run_date, pipeline_type,
      SUM(daily_count) OVER (PARTITION BY pipeline_type ORDER BY run_date) AS cumulative_count
    FROM (
      SELECT wr.created_at::date AS run_date,
        CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END AS pipeline_type,
        COUNT(*) AS daily_count
      FROM workflow_runs wr
      JOIN workflows w ON wr.workflow_id = w.id
      JOIN repositories r ON wr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND w.name NOT IN ('CodeQL', 'Labeler')
      GROUP BY wr.created_at::date,
        CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END
    ) daily_counts ORDER BY run_date, pipeline_type
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchFailures = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS workflow_name,
      COUNT(*) AS failed_runs
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) = 'failure'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY workflow_name ORDER BY workflow_name
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchAvgDuration = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS workflow_name,
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS average_duration_minutes
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY workflow_name ORDER BY workflow_name
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchRunCount = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS workflow_name,
      COUNT(*) AS run_count
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY workflow_name ORDER BY workflow_name
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchCumulativeDuration = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT CONCAT(CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, w.name) AS workflow_name,
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS cumulative_duration_minutes
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY workflow_name ORDER BY workflow_name
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchInfraPlan = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT wr.created_at AS run_timestamp,
      EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60 AS duration_minutes
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND w.pipeline LIKE '%infra_plan.yaml%' AND w.name != 'Labeler'
    ORDER BY run_timestamp
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchInfraApply = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT wr.created_at AS run_timestamp,
      EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60 AS duration_minutes
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND w.pipeline LIKE '%infra_apply.yaml%' AND w.name != 'Labeler'
    ORDER BY run_timestamp
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchSuccessRatio = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT w.name AS workflow_name, COUNT(*) AS total_runs,
      SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END) AS successful_runs,
      SUM(CASE WHEN TRIM(wr.conclusion) = 'failure' THEN 1 ELSE 0 END) AS failed_runs,
      ROUND((SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 2) AS success_rate_percentage
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) IN ('success', 'failure')
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND w.name NOT IN ('CodeQL', 'Labeler')
    GROUP BY w.name ORDER BY total_runs DESC
  `);
  return r.rows as Record<string, unknown>[];
};

const fetchSummary = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total_pipelines,
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS avg_duration_minutes,
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS total_duration_minutes,
      MIN(wr.created_at) AS first_pipeline_date
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND w.name NOT IN ('CodeQL', 'Labeler')
  `);
  return r.rows[0];
};
