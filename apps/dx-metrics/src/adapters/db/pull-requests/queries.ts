/** SQL queries and data transformation for the pull-request dashboard. */
import { sql } from "drizzle-orm";

import { METRIC_TARGETS } from "@/lib/config";
import { buildPullRequestsInsights } from "@/lib/insights/pull-requests";
import type { WithInsights } from "@/lib/insights/types";
import { PR_SIZE_BUCKETS } from "@/lib/pr-size-buckets";

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
  humanPullRequest,
  isHumanReview,
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
  prOpenBacklogRowSchema,
  prOpenCountRowSchema,
  prSizeDistributionRowSchema,
  prSizeRowSchema,
  prsByContributorRowSchema,
  prSummaryCardsSchema,
  slowestPrRowSchema,
  stalePrRowSchema,
} from "./schemas";

// Size buckets come from `@/lib/pr-size-buckets`, the same list the insight
// rules use, so the histogram and the "large PR" reading can never disagree.
const PR_SIZE_UPPER_BOUNDS = PR_SIZE_BUCKETS.filter(
  (bucket) => bucket.max !== null,
);

const prSizeRangeExpression = sql`CASE ${sql.join(
  PR_SIZE_UPPER_BOUNDS.map(
    (bucket) => sql`WHEN pr.additions <= ${bucket.max} THEN ${bucket.label}`,
  ),
  sql` `,
)} ELSE ${PR_SIZE_BUCKETS[PR_SIZE_BUCKETS.length - 1].label} END`;

const prSizeSortOrderExpression = sql`CASE ${sql.join(
  PR_SIZE_UPPER_BOUNDS.map(
    (bucket, index) =>
      sql`WHEN pr.additions <= ${bucket.max} THEN ${index + 1}`,
  ),
  sql` `,
)} ELSE ${PR_SIZE_BUCKETS.length} END`;

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
  const { days, fullName, peerBenchmark } = params;

  const referenceDate = await fetchReferenceDate(db, fullName);

  const [
    cards,
    leadTime,
    counts,
    quality,
    leadTimeStats,
    prsByContributor,
    openBacklog,
  ] = await Promise.all([
    fetchPrSummary(db, fullName, referenceDate, days),
    fetchLeadTimeData(db, fullName, referenceDate, days),
    fetchPrCountData(db, fullName, referenceDate, days),
    fetchPrQualityData(db, fullName, referenceDate, days),
    fetchLeadTimeStats(db, fullName, referenceDate, days),
    fetchPrsByContributor(db, fullName, referenceDate, days),
    fetchPrOpenBacklog(db, fullName, referenceDate, days),
  ]);

  const dashboard = {
    cards,
    ...leadTime,
    ...counts,
    ...quality,
    ...leadTimeStats,
    ...prsByContributor,
    ...openBacklog,
  };
  return {
    ...dashboard,
    insights: buildPullRequestsInsights(
      dashboard,
      `https://github.com/${fullName}`,
      peerBenchmark,
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
        AND ${humanPullRequest("pr")}
    `),
    db.execute(sql`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2) AS "previous"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
        AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND ${humanPullRequest("pr")}
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
        AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
          ROUND(AVG(pr.total_comments_count)::numeric, 2) AS "avgComments"
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}
        GROUP BY DATE_TRUNC('week', pr.created_at)::date ORDER BY week
      `),
      db.execute(sql`
        WITH bucketed AS (
          SELECT pr.additions,
            EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400 AS "leadTimeDays",
            ${prSizeRangeExpression} AS "sizeRange",
            ${prSizeSortOrderExpression} AS "sortOrder"
          FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
          WHERE r.full_name = ${fullName}
            AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
            AND pr.additions IS NOT NULL
            AND ${humanPullRequest("pr")}
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
          AND ${humanPullRequest("pr")}
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

/**
 * Pull requests created in the window grouped by author, ordered by volume.
 * The population mirrors the "Contributors" and "Total PRs" cards (human,
 * non-draft PRs created in the window), so the per-author counts sum to the
 * total and a reader can reconcile the table with the cards above it.
 */
async function fetchPrsByContributor(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<Pick<PrDashboardResult, "prsByContributor">> {
  const result = await db.execute(sql`
    SELECT pr.author, COUNT(*) AS "prCount"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.author IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY pr.author
    ORDER BY "prCount" DESC, pr.author
  `);
  return {
    prsByContributor: parseSqlRows(
      prsByContributorRowSchema,
      result.rows,
      "pull-requests prsByContributor",
    ),
  };
}

/**
 * Point-in-time backlog for pull requests that were never merged: how many are
 * still open now, how many of those have had no activity for longer than the
 * stale target, and how many were closed without merging during the window.
 * The list of stale PRs carries the concrete numbers so the reading is
 * actionable instead of just descriptive.
 */
async function fetchPrOpenBacklog(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<Pick<PrDashboardResult, "openBacklog" | "stalePrs">> {
  const [summary, stale] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE pr.closed_at IS NULL) AS "openNow",
        COUNT(*) FILTER (
          WHERE pr.closed_at IS NULL
            AND COALESCE(pr.updated_at, pr.created_at)
              < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${METRIC_TARGETS.staleOpenPrDays})
        ) AS "stale",
        COUNT(*) FILTER (
          WHERE pr.closed_at IS NOT NULL
            AND pr.closed_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        ) AS "closedUnmerged"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at IS NULL
        AND ${humanPullRequest("pr")}
    `),
    db.execute(sql`
      SELECT pr.number, pr.title, pr.author,
        ROUND(EXTRACT(EPOCH FROM (
          ${referenceDate}::timestamptz - COALESCE(pr.updated_at, pr.created_at)
        )) / 86400, 0) AS "idleDays",
        COALESCE(pr.updated_at, pr.created_at) AS "updatedAt"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${fullName}
        AND pr.merged_at IS NULL AND pr.closed_at IS NULL
        AND COALESCE(pr.updated_at, pr.created_at)
          < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${METRIC_TARGETS.staleOpenPrDays})
        AND ${humanPullRequest("pr")}
      ORDER BY "idleDays" DESC, pr.number
      LIMIT 25
    `),
  ]);

  return {
    openBacklog: parseSqlRow(
      prOpenBacklogRowSchema,
      summary.rows[0],
      "pull-requests openBacklog",
    ),
    stalePrs: parseSqlRows(
      stalePrRowSchema,
      stale.rows,
      "pull-requests stalePrs",
    ),
  };
}

async function fetchPrSummary(
  db: Database,
  fullName: string,
  referenceDate: string,
  days: number,
): Promise<PrSummaryCards> {
  // One pass produces every summary card. `avgTimeToMerge` measures the wait
  // from the last human approval to merge, for PRs merged in the window; it is
  // the same definition the review dashboard uses, kept consistent on purpose.
  const result = await db.execute(sql`
    SELECT
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric, 2)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
          AND ${humanPullRequest("pr")}) AS "avgLeadTime",
      (SELECT COUNT(*)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}) AS "totalPrs",
      (SELECT COUNT(DISTINCT pr.author)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.author IS NOT NULL
          AND ${humanPullRequest("pr")}) AS "contributors",
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600)::numeric, 2)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        JOIN LATERAL (
          SELECT submitted_at FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
            AND ${isHumanReview("prr", "pr")}
          ORDER BY submitted_at DESC LIMIT 1
        ) last_approval ON true
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}) AS "avgTimeToMerge",
      (SELECT COUNT(*)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.created_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}) AS "previousTotalPrs",
      (SELECT COUNT(DISTINCT pr.author)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        WHERE r.full_name = ${fullName}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.created_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.author IS NOT NULL
          AND ${humanPullRequest("pr")}) AS "previousContributors",
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600)::numeric, 2)
        FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
        JOIN LATERAL (
          SELECT submitted_at FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
            AND ${isHumanReview("prr", "pr")}
          ORDER BY submitted_at DESC LIMIT 1
        ) last_approval ON true
        WHERE r.full_name = ${fullName}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}) AS "previousAvgTimeToMerge"
  `);

  return parseSqlRow(
    prSummaryCardsSchema,
    result.rows[0],
    "pull-requests summary",
  );
}
