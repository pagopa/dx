import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Coerce PostgreSQL numeric strings to JS numbers
function coerceNumbers<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out = { ...row };
    for (const key of Object.keys(out)) {
      const v = out[key];
      if (typeof v === "string" && v !== "" && !isNaN(Number(v))) {
        // Keep date-like strings as strings
        if (!/\d{4}-\d{2}-\d{2}/.test(v)) {
          (out as Record<string, unknown>)[key] = Number(v);
        }
      }
    }
    return out;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repository = searchParams.get("repository") || "dx";
  const days = parseInt(searchParams.get("days") || "120");
  const org = process.env.ORGANIZATION || "pagopa";
  const fullName = `${org}/${repository}`;

  try {
    // Compute the reference date (latest data point) for this repository
    const maxDateResult = await db.execute(sql`
      SELECT COALESCE(MAX(wr.created_at), NOW()) AS max_date
      FROM workflow_runs wr
      JOIN repositories r ON wr.repository_id = r.id
      WHERE r.full_name = ${fullName}
    `);
    const maxDate = (maxDateResult.rows[0] as { max_date: string }).max_date;

    // Deployments to Production (weekly average)
    const deployments = await db.execute(sql`
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

    // DX vs Non-DX Pipeline Runs (cumulative)
    const dxVsNonDx = await db.execute(sql`
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

    // Pipeline Failures
    const failures = await db.execute(sql`
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

    // Pipeline Average Duration
    const avgDuration = await db.execute(sql`
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

    // Pipeline Run Count
    const runCount = await db.execute(sql`
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

    // Pipeline Cumulative Duration
    const cumulativeDuration = await db.execute(sql`
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

    // Infra Plan Duration
    const infraPlan = await db.execute(sql`
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

    // Infra Apply Duration
    const infraApply = await db.execute(sql`
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

    // Success/Failure Ratio
    const successRatio = await db.execute(sql`
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

    // Global Summary
    const summaryResult = await db.execute(sql`
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
    const summary = summaryResult.rows[0];

    return NextResponse.json({
      summary,
      deployments: coerceNumbers(deployments.rows as Record<string, unknown>[]),
      dxVsNonDx: coerceNumbers(dxVsNonDx.rows as Record<string, unknown>[]),
      failures: coerceNumbers(failures.rows as Record<string, unknown>[]),
      avgDuration: coerceNumbers(avgDuration.rows as Record<string, unknown>[]),
      runCount: coerceNumbers(runCount.rows as Record<string, unknown>[]),
      cumulativeDuration: coerceNumbers(
        cumulativeDuration.rows as Record<string, unknown>[],
      ),
      infraPlan: coerceNumbers(infraPlan.rows as Record<string, unknown>[]),
      infraApply: coerceNumbers(infraApply.rows as Record<string, unknown>[]),
      successRatio: coerceNumbers(
        successRatio.rows as Record<string, unknown>[],
      ),
    });
  } catch (error) {
    console.error("Workflow dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
