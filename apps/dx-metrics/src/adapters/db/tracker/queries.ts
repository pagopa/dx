/** SQL queries and data transformation for the Tracker dashboard. */

import { sql } from "drizzle-orm";

import { buildTrackerInsights } from "@/lib/insights/tracker";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type { TrackerDashboard } from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  categoryRowSchema,
  frequencyTrendRowSchema,
  priorityRowSchema,
  trackerMetricValueRowSchema,
} from "./schemas";

/** Distinct days of data required before a fitted trend is worth showing. */
const MIN_TREND_DAYS = 7;

/**
 * Predicate for "this request is closed". The underlying `is_closed` column is
 * a text-serialized boolean (`'true'` / `'false'`), so it must be compared as a
 * string; `closed_at IS NOT NULL` is the authoritative signal whenever it is
 * populated. Centralised here so every closed-count agrees on the definition.
 */
const requestClosedPredicate = sql`closed_at IS NOT NULL OR is_closed = 'true'`;

export const getTrackerDashboard = async (
  db: Database,
): Promise<TrackerDashboard & WithInsights & WithMeta> => {
  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({
      column: "submitted_at",
      from: "tracker_requests",
    }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "tracker referenceDate",
  );

  const [
    openedTotal,
    closedTotal,
    avgClose,
    requestsTrend,
    frequencyTrend,
    byCategory,
    byPriority,
  ] = await Promise.all([
    // Opened requests (total)
    db.execute(sql`
      SELECT COUNT(*) AS value FROM tracker_requests
      WHERE submitted_at IS NOT NULL
    `),
    // Closed requests (total)
    db.execute(sql`
      SELECT COUNT(*) AS value FROM tracker_requests
      WHERE ${requestClosedPredicate}
    `),
    // Avg Time to Close
    db.execute(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - submitted_at)) / 86400)::numeric, 2) AS value
      FROM tracker_requests
      WHERE ${requestClosedPredicate}
      AND closed_at IS NOT NULL
      AND submitted_at IS NOT NULL
    `),
    // Requests Trend (percentage change from linear regression). The fitted
    // line is meaningless on a couple of days of data, so the value is only
    // returned once the history spans at least MIN_TREND_DAYS distinct days.
    db.execute(sql`
      WITH daily_requests AS (
        SELECT submitted_at::date AS "requestDate", COUNT(*) AS requests
        FROM tracker_requests WHERE submitted_at IS NOT NULL
        GROUP BY submitted_at::date
      ),
      numbered_days AS (
        SELECT "requestDate", requests, ROW_NUMBER() OVER (ORDER BY "requestDate") AS "dayNumber"
        FROM daily_requests
      ),
      regression AS (
        SELECT COUNT(*) AS n, SUM("dayNumber") AS "sumX", SUM(requests) AS "sumY",
          SUM("dayNumber" * requests) AS "sumXY", SUM("dayNumber" * "dayNumber") AS "sumXX"
        FROM numbered_days
      ),
      trend_values AS (
        SELECT
          MIN(CASE WHEN nd."dayNumber" = 1 THEN
            (r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * nd."dayNumber" +
            (r."sumY" - (r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * r."sumX") / r.n
          END) AS "firstValue",
          MAX(CASE WHEN nd."dayNumber" = r.n THEN
            (r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * nd."dayNumber" +
            (r."sumY" - (r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * r."sumX") / r.n
          END) AS "lastValue"
        FROM numbered_days nd CROSS JOIN regression r
      )
      SELECT CASE WHEN (SELECT COUNT(*) FROM daily_requests) >= ${MIN_TREND_DAYS}
        THEN ROUND((("lastValue" - "firstValue") / NULLIF("firstValue", 0) * 100)::numeric, 2)
      END AS value
      FROM trend_values
    `),
    // Requests Frequency Trend chart
    db.execute(sql`
      WITH daily_requests AS (
        SELECT submitted_at::date AS "requestDate", COUNT(*) AS requests
        FROM tracker_requests WHERE submitted_at IS NOT NULL
        GROUP BY submitted_at::date
      ),
      numbered_days AS (
        SELECT "requestDate", requests, ROW_NUMBER() OVER (ORDER BY "requestDate") AS "dayNumber"
        FROM daily_requests
      ),
      regression AS (
        SELECT COUNT(*) AS n, SUM("dayNumber") AS "sumX", SUM(requests) AS "sumY",
          SUM("dayNumber" * requests) AS "sumXY", SUM("dayNumber" * "dayNumber") AS "sumXX"
        FROM numbered_days
      )
      SELECT nd."requestDate", nd.requests AS "actualRequests",
        ROUND((((r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * nd."dayNumber" +
          (r."sumY" - (r."sumXY" * r.n - r."sumX" * r."sumY") / NULLIF(r."sumXX" * r.n - r."sumX" * r."sumX", 0) * r."sumX") / r.n))::numeric, 2) AS trend
      FROM numbered_days nd CROSS JOIN regression r ORDER BY nd."requestDate"
    `),
    // Requests per Category
    db.execute(sql`
      SELECT INITCAP(category) AS category, COUNT(*) AS requests
      FROM tracker_requests WHERE category IS NOT NULL AND category != ''
      GROUP BY INITCAP(category) ORDER BY category
    `),
    // Requests per Priority
    db.execute(sql`
      SELECT INITCAP(priority) AS priority, COUNT(*) AS requests
      FROM tracker_requests WHERE priority IS NOT NULL AND priority != ''
      GROUP BY INITCAP(priority) ORDER BY priority
    `),
  ]);

  const avgCloseValue = parseSqlRow(
    trackerMetricValueRowSchema,
    avgClose.rows[0],
    "tracker avgClose",
  ).value;
  const closedTotalValue = parseSqlRow(
    trackerMetricValueRowSchema,
    closedTotal.rows[0],
    "tracker closedTotal",
  ).value;
  const openedTotalValue = parseSqlRow(
    trackerMetricValueRowSchema,
    openedTotal.rows[0],
    "tracker openedTotal",
  ).value;
  const requestsTrendValue = parseSqlRow(
    trackerMetricValueRowSchema,
    requestsTrend.rows[0],
    "tracker requestsTrend",
  ).value;

  const dashboard = {
    byCategory: parseSqlRows(
      categoryRowSchema,
      byCategory.rows,
      "tracker byCategory",
    ),
    byPriority: parseSqlRows(
      priorityRowSchema,
      byPriority.rows,
      "tracker byPriority",
    ),
    cards: {
      avgClose: avgCloseValue,
      closedTotal: closedTotalValue,
      openedTotal: openedTotalValue,
      requestsTrend: requestsTrendValue,
    },
    frequencyTrend: parseSqlRows(
      frequencyTrendRowSchema,
      frequencyTrend.rows,
      "tracker frequencyTrend",
    ),
  };

  return {
    ...dashboard,
    insights: buildTrackerInsights(dashboard),
    meta: { referenceDate },
  };
};
