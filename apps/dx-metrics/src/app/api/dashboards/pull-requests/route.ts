import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repository = searchParams.get("repository") || "dx";
  const days = parseInt(searchParams.get("days") || "120");
  const org = process.env.ORGANIZATION || "pagopa";
  const fullName = `${org}/${repository}`;

  try {
    const avgLeadTime = await db.execute(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400)::numeric, 2) AS value
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
    `);

    const totalPrs = await db.execute(sql`
      SELECT COUNT(*) AS value FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
    `);

    const totalComments = await db.execute(sql`
      SELECT COALESCE(SUM(total_comments_count), 0) AS value
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
    `);

    const commentsPerPr = await db.execute(sql`
      SELECT ROUND(SUM(total_comments_count)::numeric / NULLIF(COUNT(*), 0), 2) AS value
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
    `);

    const leadTimeMovingAvg = await db.execute(sql`
      SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
        ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS avg_lead_time_days
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
      GROUP BY DATE_TRUNC('week', pr.merged_at)::date
      ORDER BY week
    `);

    const leadTimeTrend = await db.execute(sql`
      WITH weekly_avg AS (
        SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
          ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS avg_lead_time_days,
          ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('week', pr.merged_at)::date) AS x
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY DATE_TRUNC('week', pr.merged_at)::date
      ),
      stats AS (SELECT COUNT(*) AS n, AVG(x) AS x_avg, AVG(avg_lead_time_days) AS y_avg FROM weekly_avg),
      regression AS (
        SELECT CASE WHEN SUM(POWER(w.x - s.x_avg, 2)) != 0
          THEN SUM((w.x - s.x_avg) * (w.avg_lead_time_days - s.y_avg)) / SUM(POWER(w.x - s.x_avg, 2))
          ELSE 0 END AS slope, s.y_avg, s.x_avg
        FROM weekly_avg w CROSS JOIN stats s GROUP BY s.x_avg, s.y_avg
      )
      SELECT w.week AS date,
        ROUND((r.slope * w.x + (r.y_avg - r.slope * r.x_avg))::numeric, 2) AS trend_line
      FROM weekly_avg w CROSS JOIN regression r ORDER BY w.week
    `);

    const mergedPrs = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CASE WHEN ${days} < 240 THEN (NOW() - MAKE_INTERVAL(days => ${days}))::date
               ELSE date_trunc('week', (NOW() - MAKE_INTERVAL(days => ${days}))::date)::date END,
          CASE WHEN ${days} < 240 THEN CURRENT_DATE
               ELSE date_trunc('week', CURRENT_DATE)::date END,
          CASE WHEN ${days} < 240 THEN '1 day'::interval ELSE '7 days'::interval END
        )::date AS date
      ),
      pr_counts AS (
        SELECT CASE WHEN ${days} < 240 THEN pr.merged_at::date
          ELSE date_trunc('week', pr.merged_at)::date END AS pr_date,
          COUNT(*) AS pr_count
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at <= NOW()
          AND pr.merged_at IS NOT NULL
          AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY pr_date
      )
      SELECT ds.date, COALESCE(pc.pr_count, 0) AS pr_count
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc.pr_date ORDER BY ds.date
    `);

    const unmergedPrs = await db.execute(sql`
      WITH daily_counts AS (
        SELECT generate_series(
          (SELECT MIN(created_at::date) FROM pull_requests pr
           JOIN repositories r ON pr.repository_id = r.id
           WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
           AND (pr.draft IS NULL OR pr.draft = 0)),
          CURRENT_DATE, '1 day'::interval
        )::date AS date
      ),
      pr_status AS (
        SELECT pr.created_at::date AS created_date,
          COALESCE(pr.closed_at::date, CURRENT_DATE + 1) AS closed_date
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND (pr.draft IS NULL OR pr.draft = 0)
      )
      SELECT d.date, COUNT(*) FILTER (WHERE d.date >= p.created_date AND d.date < p.closed_date) AS open_prs
      FROM daily_counts d LEFT JOIN pr_status p ON d.date >= p.created_date AND d.date < p.closed_date
      GROUP BY d.date ORDER BY d.date
    `);

    const newPrs = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CASE WHEN ${days} < 240 THEN (NOW() - MAKE_INTERVAL(days => ${days}))::date
               ELSE date_trunc('week', (NOW() - MAKE_INTERVAL(days => ${days}))::date)::date END,
          CASE WHEN ${days} < 240 THEN CURRENT_DATE
               ELSE date_trunc('week', CURRENT_DATE)::date END,
          CASE WHEN ${days} < 240 THEN '1 day'::interval ELSE '7 days'::interval END
        )::date AS date
      ),
      pr_counts AS (
        SELECT CASE WHEN ${days} < 240 THEN pr.created_at::date
          ELSE date_trunc('week', pr.created_at)::date END AS pr_date,
          COUNT(*) AS pr_count
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.created_at <= NOW()
          AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY pr_date
      )
      SELECT ds.date, COALESCE(pc.pr_count, 0) AS pr_count
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc.pr_date ORDER BY ds.date
    `);

    const cumulatedNewPrs = await db.execute(sql`
      WITH daily_pr AS (
        SELECT pr.created_at::date AS date, COUNT(*) AS daily_count
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY pr.created_at::date
      ),
      ts AS (SELECT generate_series((SELECT MIN(date) FROM daily_pr), CURRENT_DATE, '1 day'::interval)::date AS date)
      SELECT t.date, SUM(COALESCE(d.daily_count, 0)) OVER (ORDER BY t.date) AS cumulative_count
      FROM ts t LEFT JOIN daily_pr d ON t.date = d.date ORDER BY t.date
    `);

    const prSize = await db.execute(sql`
      SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
        ROUND(AVG(pr.additions)::numeric, 2) AS avg_additions
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.additions IS NOT NULL
      GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
    `);

    const prComments = await db.execute(sql`
      SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
        ROUND(AVG(pr.total_comments_count)::numeric, 2) AS avg_comments
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
      GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
    `);

    const prCommentsBySize = await db.execute(sql`
      SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
        ROUND(
          AVG(pr.total_comments_count)::numeric / NULLIF(AVG(pr.additions)::numeric, 0)
        , 2) AS avg_comments_per_addition
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
      GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
    `);

    const prSizeDistribution = await db.execute(sql`
      WITH bucketed AS (
        SELECT pr.additions,
          CASE WHEN additions <= 50 THEN '0-50' WHEN additions <= 200 THEN '51-200'
          WHEN additions <= 500 THEN '201-500' WHEN additions <= 1000 THEN '501-1000'
          ELSE '1000+' END AS size_range,
          CASE WHEN additions <= 50 THEN 1 WHEN additions <= 200 THEN 2
          WHEN additions <= 500 THEN 3 WHEN additions <= 1000 THEN 4
          ELSE 5 END AS sort_order
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.additions IS NOT NULL
          AND (pr.draft IS NULL OR pr.draft = 0)
      )
      SELECT size_range, COUNT(*) AS pr_count, ROUND(AVG(additions)::numeric, 0) AS avg_additions
      FROM bucketed GROUP BY size_range, sort_order
      ORDER BY sort_order
    `);

    const slowestPrs = await db.execute(sql`
      SELECT pr.title, ROUND(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400, 2) AS lead_time_days,
        pr.number, pr.created_at, pr.merged_at
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
      ORDER BY lead_time_days DESC LIMIT 50
    `);

    // Helper: convert string numeric values to numbers for Recharts compatibility
    // PostgreSQL returns COUNT/SUM/ROUND as strings through the pg driver
    function numericRows<T extends Record<string, unknown>>(
      rows: T[],
      keys: string[],
    ): T[] {
      return rows.map((row) => {
        const out = { ...row };
        for (const k of keys) {
          if (out[k] != null)
            (out as Record<string, unknown>)[k] = Number(out[k]);
        }
        return out;
      });
    }

    return NextResponse.json({
      cards: {
        avgLeadTime: Number(avgLeadTime.rows[0]?.value) || null,
        totalPrs: Number(totalPrs.rows[0]?.value) || null,
        totalComments: Number(totalComments.rows[0]?.value) || null,
        commentsPerPr: Number(commentsPerPr.rows[0]?.value) || null,
      },
      leadTimeMovingAvg: numericRows(leadTimeMovingAvg.rows, [
        "avg_lead_time_days",
      ]),
      leadTimeTrend: numericRows(leadTimeTrend.rows, ["trend_line"]),
      mergedPrs: numericRows(mergedPrs.rows, ["pr_count"]),
      unmergedPrs: numericRows(unmergedPrs.rows, ["open_prs"]),
      newPrs: numericRows(newPrs.rows, ["pr_count"]),
      cumulatedNewPrs: numericRows(cumulatedNewPrs.rows, ["cumulative_count"]),
      prSize: numericRows(prSize.rows, ["avg_additions"]),
      prComments: numericRows(prComments.rows, ["avg_comments"]),
      prCommentsBySize: numericRows(prCommentsBySize.rows, [
        "avg_comments_per_addition",
      ]),
      prSizeDistribution: numericRows(prSizeDistribution.rows, [
        "pr_count",
        "avg_additions",
      ]),
      slowestPrs: numericRows(slowestPrs.rows, ["lead_time_days"]),
    });
  } catch (error) {
    console.error("PR dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
