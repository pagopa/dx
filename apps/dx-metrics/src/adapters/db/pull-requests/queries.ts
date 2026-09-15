/** SQL queries and data transformation for the pull-request dashboard. */
import { sql } from "drizzle-orm";

import { buildPullRequestsInsights } from "@/lib/insights/pull-requests";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type {
  FetchPrDashboardInput,
  PrCountData,
  PrDashboardResult,
  PrLeadTimeData,
  PrQualityData,
  PrSummaryCards,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { percentileRowSchema, previousValueRowSchema } from "../shared/schemas";
import {
  botAuthorsExclusion,
  timeBucket,
  timeBucketInterval,
} from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  prCommentsRowSchema,
  prCumulativeCountRowSchema,
  prDateCountRowSchema,
  prLeadTimeMovingAvgRowSchema,
  prLeadTimeTrendRowSchema,
  prOpenCountRowSchema,
  prSizeDistributionRowSchema,
  prSizeRowSchema,
  prSummaryCardsSchema,
  slowestPrRowSchema,
} from "./schemas";

/**
 * The single population every pull-request metric is computed on: pull requests
 * opened by a human (not a bot) and not marked as draft.
 */
const HUMAN_PR = sql`${botAuthorsExclusion("pr.author")} AND (pr.draft IS NULL OR pr.draft = 0)`;

/** Resolves the latest PR activity timestamp used to anchor time windows. */
const fetchReferenceDate = async (
  db: Database,
  fullName: string,
): Promise<string> => {
  const result = await db.execute(
    buildReferenceDateQuery({
      column: "GREATEST(pr.created_at, pr.merged_at)",
      from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
      where: sql`r.full_name = ${fullName}`,
    }),
  );
  return parseReferenceDate(result.rows[0], "pull-requests referenceDate");
};

/** Fetches the complete pull-request dashboard for a repository. */
export const fetchPrDashboard = async (
  db: Database,
  params: FetchPrDashboardInput,
): Promise<PrDashboardResult & WithInsights & WithMeta> => {
  const { days, fullName } = params;

  const referenceDate = await fetchReferenceDate(db, fullName);

  const [cards, leadTime, counts, quality, leadTimeStats] = await Promise.all([
    fetchPrSummary(db, fullName, referenceDate, days),
    fetchLeadTimeData(db, fullName, referenceDate, days),
    fetchPrCountData(db, fullName, referenceDate, days),
    fetchPrQualityData(db, fullName, referenceDate, days),
    fetchLeadTimeStats(db, fullName, referenceDate, days),
  ]);

  const dashboard = {
    cards,
    ...leadTime,
    ...counts,
    ...quality,
    ...leadTimeStats,
  };
  return {
    ...dashboard,
    insights: buildPullRequestsInsights(
      dashboard,
      `https://github.com/${fullName}`,
    ),
    meta: { days, referenceDate },
  };
};

/**
 * Lead-time distribution percentiles for the selected window and the average of
 * the immediately preceding, equally-sized window. Comparing two adjacent
 * windows of the same length makes the "previous" value directly comparable to
 * the headline average, unlike a first-half split of the same window.
 */
async function fetchLeadTimeStats(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<
  Pick<PrDashboardResult, "leadTimePercentiles" | "previousLeadTime">
> {
  const [percentiles, previous] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*) AS "count",
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400
        )::numeric, 2) AS "p50",
        ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400
        )::numeric, 2) AS "p85",
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400
        )::numeric, 2) AS "p95"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND ${HUMAN_PR}
    `),
    db.execute(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS "previous"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
        AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND ${HUMAN_PR}
    `),
  ]);

  return {
    leadTimePercentiles: parseSqlRow(
      percentileRowSchema,
      percentiles.rows[0],
      "pull-requests leadTimePercentiles",
    ),
    previousLeadTime: parseSqlRow(
      previousValueRowSchema,
      previous.rows[0],
      "pull-requests previousLeadTime",
    ).previous,
  };
}

async function fetchLeadTimeData(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<PrLeadTimeData> {
  const [leadTimeMovingAvg, leadTimeTrend] = await Promise.all([
    db.execute(sql`
      SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
        ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS "avgLeadTimeDays"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND ${HUMAN_PR}
      GROUP BY DATE_TRUNC('week', pr.merged_at)::date ORDER BY week
    `),
    db.execute(sql`
      WITH weekly_avg AS (
        SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
          AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400) AS "avgLeadTimeDays",
          COUNT(*)::numeric AS weight,
          ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('week', pr.merged_at)::date) AS x
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND ${HUMAN_PR}
        GROUP BY DATE_TRUNC('week', pr.merged_at)::date
      ),
      stats AS (
        SELECT
          SUM(weight) AS "wSum",
          SUM(weight * x) AS "wxSum",
          SUM(weight * "avgLeadTimeDays") AS "wySum",
          SUM(weight * x * x) AS "wxxSum",
          SUM(weight * x * "avgLeadTimeDays") AS "wxySum"
        FROM weekly_avg
      ),
      regression AS (
        -- Weighted least squares: weeks with more merged PRs carry more weight,
        -- so a single-PR week cannot bend the trend like a fifty-PR week.
        SELECT CASE WHEN "wSum" * "wxxSum" - "wxSum" * "wxSum" <> 0
          THEN ("wSum" * "wxySum" - "wxSum" * "wySum")
            / ("wSum" * "wxxSum" - "wxSum" * "wxSum")
          ELSE 0 END AS slope,
          "wSum", "wxSum", "wySum"
        FROM stats
      )
      SELECT w.week AS date,
        ROUND((
          r.slope * w.x
          + CASE WHEN r."wSum" <> 0
            THEN (r."wySum" - r.slope * r."wxSum") / r."wSum"
            ELSE 0 END
        )::numeric, 2) AS "trendLine"
      FROM weekly_avg w CROSS JOIN regression r ORDER BY w.week
    `),
  ]);
  return {
    leadTimeMovingAvg: parseSqlRows(
      prLeadTimeMovingAvgRowSchema,
      leadTimeMovingAvg.rows,
      "pull-requests leadTimeMovingAvg",
    ),
    leadTimeTrend: parseSqlRows(
      prLeadTimeTrendRowSchema,
      leadTimeTrend.rows,
      "pull-requests leadTimeTrend",
    ),
  };
}

async function fetchPrCountData(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<PrCountData> {
  const [mergedPrs, unmergedPrs, newPrs, cumulatedNewPrs] = await Promise.all([
    db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          ${timeBucket(sql`(${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))`, days)},
          ${timeBucket(sql`(${referenceDate}::timestamptz)::date`, days)},
          ${timeBucketInterval(days)}
        )::date AS date
      ),
      pr_counts AS (
        SELECT ${timeBucket("pr.merged_at", days)} AS "prDate", COUNT(*) AS "prCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at <= ${referenceDate}::timestamptz
          AND pr.merged_at IS NOT NULL
          AND ${HUMAN_PR}
        GROUP BY "prDate"
      )
      SELECT ds.date, COALESCE(pc."prCount", 0) AS "prCount"
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc."prDate" ORDER BY ds.date
    `),
    // Open (not yet merged) pull requests per day. The window restricts the date
    // series, not the PRs, so PRs created before the window that are still open
    // are counted correctly.
    db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          (${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))::date,
          (${referenceDate}::timestamptz)::date,
          '1 day'::interval
        )::date AS date
      ),
      open_prs AS (
        SELECT pr.created_at::date AS "createdDate",
          COALESCE(pr.closed_at::date, (${referenceDate}::timestamptz)::date + 1) AS "closedDate"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at IS NOT NULL
          AND pr.merged_at IS NULL
          AND (pr.closed_at IS NULL OR pr.closed_at > ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))
          AND ${HUMAN_PR}
      )
      SELECT d.date, COUNT(p."createdDate") AS "openPrs"
      FROM date_series d
      LEFT JOIN open_prs p ON d.date >= p."createdDate" AND d.date < p."closedDate"
      GROUP BY d.date ORDER BY d.date
    `),
    db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          ${timeBucket(sql`(${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))`, days)},
          ${timeBucket(sql`(${referenceDate}::timestamptz)::date`, days)},
          ${timeBucketInterval(days)}
        )::date AS date
      ),
      pr_counts AS (
        SELECT ${timeBucket("pr.created_at", days)} AS "prDate", COUNT(*) AS "prCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.created_at <= ${referenceDate}::timestamptz
          AND ${HUMAN_PR}
        GROUP BY "prDate"
      )
      SELECT ds.date, COALESCE(pc."prCount", 0) AS "prCount"
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc."prDate" ORDER BY ds.date
    `),
    db.execute(sql`
      WITH daily_pr AS (
        SELECT pr.created_at::date AS date, COUNT(*) AS "dailyCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${HUMAN_PR}
        GROUP BY pr.created_at::date
      ),
      ts AS (SELECT generate_series((SELECT MIN(date) FROM daily_pr), (${referenceDate}::timestamptz)::date, '1 day'::interval)::date AS date)
      SELECT t.date, SUM(COALESCE(d."dailyCount", 0)) OVER (ORDER BY t.date) AS "cumulativeCount"
      FROM ts t LEFT JOIN daily_pr d ON t.date = d.date ORDER BY t.date
    `),
  ]);
  return {
    cumulatedNewPrs: parseSqlRows(
      prCumulativeCountRowSchema,
      cumulatedNewPrs.rows,
      "pull-requests cumulatedNewPrs",
    ),
    mergedPrs: parseSqlRows(
      prDateCountRowSchema,
      mergedPrs.rows,
      "pull-requests mergedPrs",
    ),
    newPrs: parseSqlRows(
      prDateCountRowSchema,
      newPrs.rows,
      "pull-requests newPrs",
    ),
    unmergedPrs: parseSqlRows(
      prOpenCountRowSchema,
      unmergedPrs.rows,
      "pull-requests unmergedPrs",
    ),
  };
}

async function fetchPrQualityData(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<PrQualityData> {
  const [prSize, prComments, prSizeDistribution, slowestPrs] =
    await Promise.all([
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(AVG(pr.additions)::numeric, 2) AS "avgAdditions"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.additions IS NOT NULL
          AND ${HUMAN_PR}
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(AVG(pr.total_comments_count)::numeric, 2) AS "avgComments"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${HUMAN_PR}
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        WITH bucketed AS (
          SELECT pr.additions,
            EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400 AS "leadTimeDays",
            CASE WHEN additions <= 50 THEN '0-50' WHEN additions <= 200 THEN '51-200'
            WHEN additions <= 500 THEN '201-500' WHEN additions <= 1000 THEN '501-1000'
            ELSE '1000+' END AS "sizeRange",
            CASE WHEN additions <= 50 THEN 1 WHEN additions <= 200 THEN 2
            WHEN additions <= 500 THEN 3 WHEN additions <= 1000 THEN 4
            ELSE 5 END AS "sortOrder"
          FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
          WHERE r.full_name = ${fullName}
            AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
            AND pr.additions IS NOT NULL
            AND ${HUMAN_PR}
        )
        SELECT "sizeRange", COUNT(*) AS "prCount", ROUND(AVG(additions)::numeric, 0) AS "avgAdditions",
          ROUND(AVG("leadTimeDays")::numeric, 2) AS "avgLeadTimeDays"
        FROM bucketed GROUP BY "sizeRange", "sortOrder" ORDER BY "sortOrder"
      `),
      db.execute(sql`
        SELECT pr.title, ROUND(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400, 2) AS "leadTimeDays",
          pr.number, pr.created_at AS "createdAt", pr.merged_at AS "mergedAt"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND ${HUMAN_PR}
        ORDER BY "leadTimeDays" DESC LIMIT 50
      `),
    ]);
  return {
    prComments: parseSqlRows(
      prCommentsRowSchema,
      prComments.rows,
      "pull-requests prComments",
    ),
    prSize: parseSqlRows(prSizeRowSchema, prSize.rows, "pull-requests prSize"),
    prSizeDistribution: parseSqlRows(
      prSizeDistributionRowSchema,
      prSizeDistribution.rows,
      "pull-requests prSizeDistribution",
    ),
    slowestPrs: parseSqlRows(
      slowestPrRowSchema,
      slowestPrs.rows,
      "pull-requests slowestPrs",
    ),
  };
}

async function fetchPrSummary(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<PrSummaryCards> {
  // A single scan over the same population produces every summary card.
  const result = await db.execute(sql`
    SELECT
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND ${HUMAN_PR}) AS "avgLeadTime",
      (SELECT COUNT(*)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${HUMAN_PR}) AS "totalPrs",
      (SELECT COALESCE(SUM(pr.total_comments_count), 0)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${HUMAN_PR}) AS "totalComments",
      (SELECT ROUND(SUM(pr.total_comments_count)::numeric / NULLIF(COUNT(*), 0), 2)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${HUMAN_PR}) AS "commentsPerPr"
  `);

  return parseSqlRow(
    prSummaryCardsSchema,
    result.rows[0],
    "pull-requests summary",
  );
}
