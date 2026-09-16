/** SQL queries and data transformation for the workflows dashboard. */

import { sql } from "drizzle-orm";

import { buildWorkflowsInsights } from "@/lib/insights/workflows";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type {
  GetWorkflowDashboardInput,
  WorkflowDashboardResult,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { percentileRowSchema } from "../shared/schemas";
import {
  deployWorkflowMatch,
  dxPipelineCase,
  dxWorkflowNameLabel,
  workflowNameExclusion,
} from "../shared/sql-fragments";
import {
  parseOptionalSqlRow,
  parseSqlRow,
  parseSqlRows,
} from "../shared/sql-parsing";
import {
  workflowAvgDurationSchema,
  workflowCumulativeDurationSchema,
  workflowDeploymentSchema,
  workflowDxVsNonDxSchema,
  workflowFailureSchema,
  workflowInfraDurationSchema,
  workflowRunCountSchema,
  workflowSuccessRatioSchema,
  workflowSuccessRateStatsSchema,
  workflowSummarySchema,
  workflowTriggerBreakdownSchema,
  workflowTriggerTypeSchema,
} from "./schemas";

/** Fetch all workflow dashboard data for the given repository and time window. */
export const getWorkflowDashboard = async (
  db: Database,
  params: GetWorkflowDashboardInput,
): Promise<WorkflowDashboardResult & WithInsights & WithMeta> => {
  const { days, fullName } = params;

  const referenceDate = await fetchReferenceDate(db, fullName);

  // Card/insight deltas compare the two halves of the selected window.
  const half = Math.max(1, Math.floor(days / 2));

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
    successRateStats,
    durationPercentiles,
    triggerTypes,
    triggerBreakdown,
  ] = await Promise.all([
    fetchDeployments(db, fullName, days, referenceDate),
    fetchDxVsNonDx(db, fullName, days, referenceDate),
    fetchFailures(db, fullName, days, referenceDate),
    fetchAvgDuration(db, fullName, days, referenceDate),
    fetchRunCount(db, fullName, days, referenceDate),
    fetchCumulativeDuration(db, fullName, days, referenceDate),
    fetchInfraPlan(db, fullName, days, referenceDate),
    fetchInfraApply(db, fullName, days, referenceDate),
    fetchSuccessRatio(db, fullName, days, referenceDate),
    fetchSummary(db, fullName, days, referenceDate),
    fetchSuccessRateStats(db, fullName, days, half, referenceDate),
    fetchDurationPercentiles(db, fullName, days, referenceDate),
    fetchTriggerTypes(db, fullName, days, referenceDate),
    fetchTriggerBreakdown(db, fullName, days, referenceDate),
  ]);

  const dashboard = {
    avgDuration,
    cumulativeDuration,
    deployments,
    durationPercentiles,
    dxVsNonDx,
    failures,
    infraApply,
    infraPlan,
    runCount,
    successRatio,
    successRateStats,
    summary: summaryResult,
    triggerBreakdown,
    triggerTypes,
  };
  return {
    ...dashboard,
    insights: buildWorkflowsInsights(
      dashboard,
      `https://github.com/${fullName}`,
    ),
    meta: { days, referenceDate },
  };
};

const fetchReferenceDate = async (db: Database, fullName: string) => {
  // Some metrics filter on `created_at` and others on `updated_at`; anchoring
  // the window to the latest activity in either column keeps both populations
  // inside the same window instead of silently truncating one of them.
  const result = await db.execute(
    buildReferenceDateQuery({
      column: "GREATEST(wr.created_at, wr.updated_at)",
      from: "workflow_runs wr JOIN repositories r ON wr.repository_id = r.id",
      where: sql`r.full_name = ${fullName}`,
    }),
  );
  return parseReferenceDate(result.rows[0], "workflows referenceDate");
};

const fetchDeployments = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  // Heuristic deployment frequency: workflow runs whose name suggests a
  // deploy/release/apply step. The data model has no explicit environment or
  // deployment event, so this is a proxy — the UI labels it accordingly.
  const r = await db.execute(sql`
    SELECT DATE_TRUNC('week', wr.created_at) AS "runWeek",
      COUNT(*) AS "weeklyDeploymentCount"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND ${deployWorkflowMatch("w.name")}
      AND TRIM(wr.conclusion) = 'success'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${workflowNameExclusion("w.name")}
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
        ${dxPipelineCase("w.pipeline")} AS "pipelineType",
        COUNT(*) AS "dailyCount"
      FROM workflow_runs wr
      JOIN workflows w ON wr.workflow_id = w.id
      JOIN repositories r ON wr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${workflowNameExclusion("w.name")}
      GROUP BY wr.created_at::date,
        ${dxPipelineCase("w.pipeline")}
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
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName",
      COUNT(*) AS "failedRuns"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) = 'failure'
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${workflowNameExclusion("w.name")}
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
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName",
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "averageDurationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
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
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName",
      COUNT(*) AS "runCount"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
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
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName",
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at))) / 60 AS "cumulativeDurationMinutes"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
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
      AND w.pipeline LIKE '%infra_plan.yaml%' AND ${workflowNameExclusion("w.name")}
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
      AND w.pipeline LIKE '%infra_apply.yaml%' AND ${workflowNameExclusion("w.name")}
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
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName", COUNT(*) AS "totalRuns",
      SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END) AS "successfulRuns",
      SUM(CASE WHEN TRIM(wr.conclusion) = 'failure' THEN 1 ELSE 0 END) AS "failedRuns",
      ROUND((SUM(CASE WHEN TRIM(wr.conclusion) = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric, 2) AS "successRatePercentage"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND TRIM(wr.conclusion) IN ('success', 'failure')
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${workflowNameExclusion("w.name")}
    GROUP BY w.name, w.pipeline ORDER BY "totalRuns" DESC
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
      (COUNT(*) FILTER (WHERE TRIM(wr.conclusion) = 'success'))::int AS "totalPipelines",
      AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)))
        FILTER (WHERE TRIM(wr.conclusion) = 'success') / 60 AS "avgDurationMinutes",
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)))
        FILTER (WHERE TRIM(wr.conclusion) = 'success') / 60 AS "totalDurationMinutes",
      SUM(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)))
        FILTER (WHERE TRIM(wr.conclusion) = 'failure') / 60 AS "failedDurationMinutes",
      MIN(wr.created_at) AS "firstPipelineDate"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) IN ('success', 'failure')
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
  `);
  return parseOptionalSqlRow(
    workflowSummarySchema,
    r.rows[0],
    "workflows summary",
  );
};

const fetchSuccessRateStats = async (
  db: Database,
  fullName: string,
  days: number,
  half: number,
  maxDate: string,
) => {
  // Current = recent half of the window, previous = first half, so the delta
  // describes a change inside the visible window.
  const r = await db.execute(sql`
    SELECT
      ROUND(
        (COUNT(*) FILTER (WHERE TRIM(wr.conclusion) = 'success'))::numeric
        / NULLIF(COUNT(*) FILTER (WHERE TRIM(wr.conclusion) IN ('success', 'failure')), 0) * 100
      , 2) AS "current",
      (SELECT ROUND(
          (COUNT(*) FILTER (WHERE TRIM(wr2.conclusion) = 'success'))::numeric
          / NULLIF(COUNT(*) FILTER (WHERE TRIM(wr2.conclusion) IN ('success', 'failure')), 0) * 100
        , 2)
       FROM workflow_runs wr2
       JOIN workflows w2 ON wr2.workflow_id = w2.id
       JOIN repositories r2 ON wr2.repository_id = r2.id
       WHERE r2.full_name = ${fullName}
         AND wr2.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
         AND wr2.updated_at < ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${half})
         AND ${workflowNameExclusion("w2.name")}
      ) AS "previous"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${half})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
  `);
  return parseSqlRow(
    workflowSuccessRateStatsSchema,
    r.rows[0],
    "workflows successRateStats",
  );
};

const fetchDurationPercentiles = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT
      COUNT(*) AS "count",
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60
      )::numeric, 2) AS "p50",
      ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60
      )::numeric, 2) AS "p85",
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)) / 60
      )::numeric, 2) AS "p95"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.status = 'completed' AND TRIM(wr.conclusion) = 'success'
      AND wr.updated_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
  `);
  return parseSqlRow(
    percentileRowSchema,
    r.rows[0],
    "workflows durationPercentiles",
  );
};

/**
 * Run counts grouped by how the run was triggered. GitHub only exposes a
 * dedicated event for manual dispatches (`workflow_dispatch`); every other
 * event (push, pull request, schedule, workflow_call, ...) is repository- or
 * API-driven, so it is classified as automatic. Rows imported before the
 * `event` column existed are reported as Unknown until a re-import backfills
 * them, so the pie stays honest instead of guessing.
 */
const fetchTriggerTypes = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT
      CASE
        WHEN wr.event = 'workflow_dispatch' THEN 'Manual'
        WHEN wr.event IS NULL OR TRIM(wr.event) = '' THEN 'Unknown'
        ELSE 'Automatic'
      END AS "triggerType",
      COUNT(*) AS "runCount"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
    GROUP BY "triggerType" ORDER BY "runCount" DESC
  `);
  return parseSqlRows(
    workflowTriggerTypeSchema,
    r.rows,
    "workflows triggerTypes",
  );
};

/**
 * Per-workflow breakdown of runs by trigger class: manual (`workflow_dispatch`),
 * automatic (every other recorded event), and unknown (no event recorded). One
 * row per workflow, ordered by total runs so a stacked chart reads
 * busiest-first; mirrors the population and labels of {@link fetchTriggerTypes}
 * so the two charts cannot disagree.
 */
const fetchTriggerBreakdown = async (
  db: Database,
  fullName: string,
  days: number,
  maxDate: string,
) => {
  const r = await db.execute(sql`
    SELECT ${dxWorkflowNameLabel("w.name", "w.pipeline")} AS "workflowName",
      COUNT(*) FILTER (WHERE wr.event = 'workflow_dispatch') AS "manual",
      COUNT(*) FILTER (
        WHERE wr.event IS NOT NULL AND TRIM(wr.event) <> '' AND wr.event <> 'workflow_dispatch'
      ) AS "automatic",
      COUNT(*) FILTER (WHERE wr.event IS NULL OR TRIM(wr.event) = '') AS "unknown"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND wr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.created_at <= ${maxDate}::timestamptz
      AND ${workflowNameExclusion("w.name")}
    GROUP BY "workflowName"
    ORDER BY COUNT(*) DESC
  `);
  return parseSqlRows(
    workflowTriggerBreakdownSchema,
    r.rows,
    "workflows triggerBreakdown",
  );
};
