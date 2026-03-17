/** SQL queries and data transformation for the pull-request dashboard. */
import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type {
  FetchPrDashboardInput,
  PrCountData,
  PrDashboardResult,
  PrLeadTimeData,
  PrQualityData,
  PrSummaryCards,
} from "./schemas";

import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  prCommentsBySizeRowSchema,
  prCommentsRowSchema,
  prCumulativeCountRowSchema,
  prDateCountRowSchema,
  prLeadTimeMovingAvgRowSchema,
  prLeadTimeTrendRowSchema,
  prMetricValueRowSchema,
  prOpenCountRowSchema,
  prSizeDistributionRowSchema,
  prSizeRowSchema,
  slowestPrRowSchema,
} from "./schemas";

/** Fetches the complete pull-request dashboard for a repository. */
export const fetchPrDashboard = async (
  db: Database,
  params: FetchPrDashboardInput,
): Promise<PrDashboardResult> => {
  const { days, fullName } = params;
  const [cards, leadTime, counts, quality] = await Promise.all([
    fetchPrSummary(db, fullName, days),
    fetchLeadTimeData(db, fullName, days),
    fetchPrCountData(db, fullName, days),
    fetchPrQualityData(db, fullName, days),
  ]);
  return { cards, ...leadTime, ...counts, ...quality };
};

async function fetchLeadTimeData(
  db: Database,
  fullName: string,
  days: number,
): Promise<PrLeadTimeData> {
  const [leadTimeMovingAvg, leadTimeTrend] = await Promise.all([
    db.execute(sql`
      SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
        ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS "avgLeadTimeDays"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
        AND (pr.draft IS NULL OR pr.draft = 0)
      GROUP BY DATE_TRUNC('week', pr.merged_at)::date ORDER BY week
    `),
    db.execute(sql`
      WITH weekly_avg AS (
        SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
          ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS "avgLeadTimeDays",
          ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('week', pr.merged_at)::date) AS x
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY DATE_TRUNC('week', pr.merged_at)::date
      ),
      stats AS (SELECT COUNT(*) AS n, AVG(x) AS "xAvg", AVG("avgLeadTimeDays") AS "yAvg" FROM weekly_avg),
      regression AS (
        SELECT CASE WHEN SUM(POWER(w.x - s."xAvg", 2)) != 0
          THEN SUM((w.x - s."xAvg") * (w."avgLeadTimeDays" - s."yAvg")) / SUM(POWER(w.x - s."xAvg", 2))
          ELSE 0 END AS slope, s."yAvg", s."xAvg"
        FROM weekly_avg w CROSS JOIN stats s GROUP BY s."xAvg", s."yAvg"
      )
      SELECT w.week AS date,
        ROUND((r.slope * w.x + (r."yAvg" - r.slope * r."xAvg"))::numeric, 2) AS "trendLine"
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
  days: number,
): Promise<PrCountData> {
  const [mergedPrs, unmergedPrs, newPrs, cumulatedNewPrs] = await Promise.all([
    db.execute(sql`
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
          ELSE date_trunc('week', pr.merged_at)::date END AS "prDate", COUNT(*) AS "prCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.merged_at <= NOW()
          AND pr.merged_at IS NOT NULL AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY "prDate"
      )
      SELECT ds.date, COALESCE(pc."prCount", 0) AS "prCount"
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc."prDate" ORDER BY ds.date
    `),
    db.execute(sql`
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
        SELECT pr.created_at::date AS "createdDate",
          COALESCE(pr.closed_at::date, CURRENT_DATE + 1) AS "closedDate"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        AND (pr.draft IS NULL OR pr.draft = 0)
      )
      SELECT d.date, COUNT(*) FILTER (WHERE d.date >= p."createdDate" AND d.date < p."closedDate") AS "openPrs"
      FROM daily_counts d LEFT JOIN pr_status p ON d.date >= p."createdDate" AND d.date < p."closedDate"
      GROUP BY d.date ORDER BY d.date
    `),
    db.execute(sql`
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
          ELSE date_trunc('week', pr.created_at)::date END AS "prDate", COUNT(*) AS "prCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.created_at <= NOW()
          AND (pr.draft IS NULL OR pr.draft = 0)
        GROUP BY "prDate"
      )
      SELECT ds.date, COALESCE(pc."prCount", 0) AS "prCount"
      FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc."prDate" ORDER BY ds.date
    `),
    db.execute(sql`
      WITH daily_pr AS (
        SELECT pr.created_at::date AS date, COUNT(*) AS "dailyCount"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY pr.created_at::date
      ),
      ts AS (SELECT generate_series((SELECT MIN(date) FROM daily_pr), CURRENT_DATE, '1 day'::interval)::date AS date)
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
  days: number,
): Promise<PrQualityData> {
  const [prSize, prComments, prCommentsBySize, prSizeDistribution, slowestPrs] =
    await Promise.all([
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(AVG(pr.additions)::numeric, 2) AS "avgAdditions"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.additions IS NOT NULL
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(AVG(pr.total_comments_count)::numeric, 2) AS "avgComments"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName} AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(
            AVG(pr.total_comments_count)::numeric / NULLIF(AVG(pr.additions)::numeric, 0)
          , 2) AS "avgCommentsPerAddition"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        WITH bucketed AS (
          SELECT pr.additions,
            CASE WHEN additions <= 50 THEN '0-50' WHEN additions <= 200 THEN '51-200'
            WHEN additions <= 500 THEN '201-500' WHEN additions <= 1000 THEN '501-1000'
            ELSE '1000+' END AS "sizeRange",
            CASE WHEN additions <= 50 THEN 1 WHEN additions <= 200 THEN 2
            WHEN additions <= 500 THEN 3 WHEN additions <= 1000 THEN 4
            ELSE 5 END AS "sortOrder"
          FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
          WHERE r.full_name = ${fullName}
            AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days}) AND pr.additions IS NOT NULL
            AND (pr.draft IS NULL OR pr.draft = 0)
        )
        SELECT "sizeRange", COUNT(*) AS "prCount", ROUND(AVG(additions)::numeric, 0) AS "avgAdditions"
        FROM bucketed GROUP BY "sizeRange", "sortOrder" ORDER BY "sortOrder"
      `),
      db.execute(sql`
        SELECT pr.title, ROUND(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400, 2) AS "leadTimeDays",
          pr.number, pr.created_at AS "createdAt", pr.merged_at AS "mergedAt"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
        ORDER BY "leadTimeDays" DESC LIMIT 50
      `),
    ]);
  return {
    prComments: parseSqlRows(
      prCommentsRowSchema,
      prComments.rows,
      "pull-requests prComments",
    ),
    prCommentsBySize: parseSqlRows(
      prCommentsBySizeRowSchema,
      prCommentsBySize.rows,
      "pull-requests prCommentsBySize",
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
  days: number,
): Promise<PrSummaryCards> {
  const [avgLeadTime, totalPrs, totalComments, commentsPerPr] =
    await Promise.all([
      db.execute(sql`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (merged_at - created_at)) / 86400)::numeric, 2) AS value
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
      `),
      db.execute(sql`
        SELECT COUNT(*) AS value FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(total_comments_count), 0) AS value
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
      `),
      db.execute(sql`
        SELECT ROUND(SUM(total_comments_count)::numeric / NULLIF(COUNT(*), 0), 2) AS value
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
          AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
          AND (pr.draft IS NULL OR pr.draft = 0)
      `),
    ]);

  const avgLeadTimeValue = parseSqlRow(
    prMetricValueRowSchema,
    avgLeadTime.rows[0],
    "pull-requests avgLeadTime",
  ).value;
  const commentsPerPrValue = parseSqlRow(
    prMetricValueRowSchema,
    commentsPerPr.rows[0],
    "pull-requests commentsPerPr",
  ).value;
  const totalCommentsValue = parseSqlRow(
    prMetricValueRowSchema,
    totalComments.rows[0],
    "pull-requests totalComments",
  ).value;
  const totalPrsValue = parseSqlRow(
    prMetricValueRowSchema,
    totalPrs.rows[0],
    "pull-requests totalPrs",
  ).value;

  return {
    avgLeadTime: avgLeadTimeValue,
    commentsPerPr: commentsPerPrValue,
    totalComments: totalCommentsValue,
    totalPrs: totalPrsValue,
  };
}
