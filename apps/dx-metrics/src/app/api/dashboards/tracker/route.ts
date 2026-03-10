import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Opened requests (total)
    const openedTotal = await db.execute(sql`
      SELECT COUNT(*) AS value FROM tracker_requests
      WHERE submitted_at IS NOT NULL
    `);

    // Closed requests (total)
    const closedTotal = await db.execute(sql`
      SELECT COUNT(*) AS value FROM tracker_requests 
      WHERE is_closed = 'true' 
      OR closed_at IS NOT NULL
    `);

    // Avg Time to Close
    const avgClose = await db.execute(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - submitted_at)) / 86400)::numeric, 2) AS value
      FROM tracker_requests 
      WHERE (is_closed = 'true' OR closed_at IS NOT NULL)
      AND closed_at IS NOT NULL 
      AND submitted_at IS NOT NULL
    `);

    // Requests Trend (percentage change from linear regression)
    const requestsTrend = await db.execute(sql`
      WITH daily_requests AS (
        SELECT submitted_at::date AS request_date, COUNT(*) AS requests
        FROM tracker_requests WHERE submitted_at IS NOT NULL
        GROUP BY submitted_at::date
      ),
      numbered_days AS (
        SELECT request_date, requests, ROW_NUMBER() OVER (ORDER BY request_date) AS day_number
        FROM daily_requests
      ),
      regression AS (
        SELECT COUNT(*) AS n, SUM(day_number) AS sum_x, SUM(requests) AS sum_y,
          SUM(day_number * requests) AS sum_xy, SUM(day_number * day_number) AS sum_xx
        FROM numbered_days
      ),
      trend_values AS (
        SELECT
          MIN(CASE WHEN nd.day_number = 1 THEN
            (r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * nd.day_number +
            (r.sum_y - (r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * r.sum_x) / r.n
          END) AS first_value,
          MAX(CASE WHEN nd.day_number = r.n THEN
            (r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * nd.day_number +
            (r.sum_y - (r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * r.sum_x) / r.n
          END) AS last_value
        FROM numbered_days nd CROSS JOIN regression r
      )
      SELECT ROUND(((last_value - first_value) / NULLIF(first_value, 0) * 100)::numeric, 2) AS value
      FROM trend_values
    `);

    // Requests Frequency Trend chart
    const frequencyTrend = await db.execute(sql`
      WITH daily_requests AS (
        SELECT submitted_at::date AS request_date, COUNT(*) AS requests
        FROM tracker_requests WHERE submitted_at IS NOT NULL
        GROUP BY submitted_at::date
      ),
      numbered_days AS (
        SELECT request_date, requests, ROW_NUMBER() OVER (ORDER BY request_date) AS day_number
        FROM daily_requests
      ),
      regression AS (
        SELECT COUNT(*) AS n, SUM(day_number) AS sum_x, SUM(requests) AS sum_y,
          SUM(day_number * requests) AS sum_xy, SUM(day_number * day_number) AS sum_xx
        FROM numbered_days
      )
      SELECT nd.request_date, nd.requests AS actual_requests,
        ROUND(((r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * nd.day_number +
          (r.sum_y - (r.sum_xy * r.n - r.sum_x * r.sum_y) / NULLIF(r.sum_xx * r.n - r.sum_x * r.sum_x, 0) * r.sum_x) / r.n)::numeric, 2) AS trend
      FROM numbered_days nd CROSS JOIN regression r ORDER BY nd.request_date
    `);

    // Requests per Category
    const byCategory = await db.execute(sql`
      SELECT INITCAP(category) AS category, COUNT(*) AS requests
      FROM tracker_requests WHERE category IS NOT NULL AND category != ''
      GROUP BY INITCAP(category) ORDER BY category
    `);

    // Requests per Priority
    const byPriority = await db.execute(sql`
      SELECT INITCAP(priority) AS priority, COUNT(*) AS requests
      FROM tracker_requests WHERE priority IS NOT NULL AND priority != ''
      GROUP BY INITCAP(priority) ORDER BY priority
    `);

    return NextResponse.json({
      cards: {
        openedTotal: openedTotal.rows[0]?.value,
        closedTotal: closedTotal.rows[0]?.value,
        avgClose: avgClose.rows[0]?.value,
        requestsTrend: requestsTrend.rows[0]?.value,
      },
      frequencyTrend: frequencyTrend.rows,
      byCategory: byCategory.rows,
      byPriority: byPriority.rows,
    });
  } catch (error) {
    console.error("Tracker dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
