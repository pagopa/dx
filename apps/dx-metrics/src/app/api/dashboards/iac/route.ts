import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { DX_TEAM_MEMBERS } from "@/lib/config";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repository = searchParams.get("repository") || "io-infra";
  const days = parseInt(searchParams.get("days") || "120");
  const org = process.env.ORGANIZATION || "pagopa";
  const fullName = `${org}/${repository}`;

  try {
    // Compute the reference date (latest data point) for this repository
    const maxDateResult = await db.execute(sql`
      SELECT COALESCE(MAX(GREATEST(created_at, merged_at)), NOW()) AS max_date
      FROM iac_pr_lead_times
      WHERE repository_full_name = ${fullName}
    `);
    const maxDate = (maxDateResult.rows[0] as { max_date: string }).max_date;

    // IaC PR Lead Time (weekly average)
    const leadTimeMovingAvg = await db.execute(sql`
      SELECT DATE_TRUNC('week', merged_at)::date AS week,
        ROUND(AVG(EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400)::numeric, 2) AS avg_lead_time_days
      FROM iac_pr_lead_times
      WHERE repository_full_name = ${fullName}
        AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND created_at IS NOT NULL AND merged_at IS NOT NULL
        AND title != 'Version Packages'
      GROUP BY DATE_TRUNC('week', merged_at)::date
      ORDER BY week
    `);

    // IaC PR Lead Time (trend)
    const leadTimeTrend = await db.execute(sql`
      WITH pr_lead_times AS (
        SELECT created_at::date AS created_date,
          EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400 AS lead_time_days,
          ROW_NUMBER() OVER (ORDER BY created_at::date) AS x
        FROM iac_pr_lead_times
        WHERE repository_full_name = ${fullName}
          AND merged_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND created_at IS NOT NULL AND merged_at IS NOT NULL
          AND title != 'Version Packages'
      ),
      stats AS (SELECT COUNT(*) AS n, AVG(x) AS x_avg, AVG(lead_time_days) AS y_avg FROM pr_lead_times),
      regression AS (
        SELECT CASE WHEN SUM(POWER(p.x - s.x_avg, 2)) != 0
          THEN SUM((p.x - s.x_avg) * (p.lead_time_days - s.y_avg)) / SUM(POWER(p.x - s.x_avg, 2))
          ELSE 0 END AS slope, s.y_avg, s.x_avg
        FROM pr_lead_times p CROSS JOIN stats s GROUP BY s.x_avg, s.y_avg
      )
      SELECT p.created_date AS date,
        GREATEST(ROUND((r.slope * p.x + (r.y_avg - r.slope * r.x_avg))::numeric, 2), 0) AS trend_line
      FROM pr_lead_times p CROSS JOIN regression r ORDER BY p.created_date
    `);

    // Supervised vs Unsupervised IaC PRs (cumulative)
    // A PR is "supervised" when authored by a DX team member OR merged/reviewed by one.
    const dxMembers = DX_TEAM_MEMBERS;
    const dxMembersSql = sql.join(
      dxMembers.map((m) => sql`${m}`),
      sql`, `,
    );
    const supervisedVsUnsupervised = await db.execute(sql`
      WITH classified AS (
        SELECT ipr.created_at::date AS run_date,
          CASE WHEN ipr.author IN (${dxMembersSql})
                    OR pr.merged_by IN (${dxMembersSql})
               THEN 'Supervised PRs'
               ELSE 'Unsupervised PRs' END AS pr_type
        FROM iac_pr_lead_times ipr
        LEFT JOIN pull_requests pr ON pr.repository_id = ipr.repository_id AND pr.number = ipr.pr_number
        WHERE ipr.repository_full_name = ${fullName}
          AND ipr.created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ipr.created_at IS NOT NULL AND ipr.title != 'Version Packages'
          AND (pr.draft IS NULL OR pr.draft = 0)
      )
      SELECT run_date, pr_type,
        SUM(daily_count) OVER (PARTITION BY pr_type ORDER BY run_date) AS cumulative_count
      FROM (
        SELECT run_date, pr_type, COUNT(*) AS daily_count
        FROM classified
        GROUP BY run_date, pr_type
      ) daily_counts ORDER BY run_date, pr_type
    `);

    // IaC PRs Count Over Time
    const prsOverTime = await db.execute(sql`
      SELECT DATE_TRUNC('week', created_at)::date AS week,
        COUNT(*) AS pr_count
      FROM iac_pr_lead_times
      WHERE repository_full_name = ${fullName}
        AND created_at >= ${maxDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND created_at IS NOT NULL AND title != 'Version Packages'
      GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY week
    `);

    // IaC PRs by DX team member (authored or reviewed/merged)
    const prsByReviewer = await db.execute(sql`
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
            CASE WHEN author IN (${dxMembersSql}) THEN author END,
            CASE WHEN merged_by IN (${dxMembersSql}) AND merged_by != author THEN merged_by END
          ]) AS member
        FROM base
      )
      SELECT member AS reviewer,
        COUNT(*) AS total_prs,
        COUNT(*) FILTER (WHERE merged_at IS NOT NULL) AS merged_prs,
        ROUND(AVG(CASE WHEN merged_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400 END)::numeric, 2) AS avg_lead_time_days
      FROM expanded
      WHERE member IS NOT NULL
      GROUP BY member ORDER BY total_prs DESC
    `);

    return NextResponse.json({
      leadTimeMovingAvg: leadTimeMovingAvg.rows,
      leadTimeTrend: leadTimeTrend.rows,
      supervisedVsUnsupervised: supervisedVsUnsupervised.rows,
      prsOverTime: prsOverTime.rows,
      prsByReviewer: prsByReviewer.rows,
    });
  } catch (error) {
    console.error("IaC dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
