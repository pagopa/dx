/** SQL queries and data transformation for the Copilot dashboard. */

import { sql } from "drizzle-orm";

import { COPILOT_PR_AUTHOR } from "@/lib/config";
import { buildCopilotInsights } from "@/lib/insights/copilot";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type { CopilotDashboard, GetCopilotDashboardInput } from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import {
  copilotCoauthorTrailerMatch,
  humanPullRequest,
  isCopilotReview,
  isHumanReview,
  repositoryIn,
} from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  copilotAuthoredPrRowSchema,
  copilotCardsSchema,
  copilotCoauthorLeadTimeRowSchema,
  copilotCommitRepoRowSchema,
  copilotCoverageTrendRowSchema,
  copilotPrSizeRowSchema,
  copilotReviewCombinationSchema,
  copilotWeeklyTrendRowSchema,
} from "./schemas";

export const getCopilotDashboard = async (
  db: Database,
  { days, fullNames }: GetCopilotDashboardInput,
): Promise<CopilotDashboard & WithInsights & WithMeta> => {
  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({
      column: "GREATEST(pr.created_at, pr.merged_at)",
      from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
      where: repositoryIn("r.full_name", fullNames),
    }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "copilot referenceDate",
  );

  // --- Headline metrics (population: pull requests merged in the window) ---
  // "Copilot review" means a review from the Copilot reviewer bot. Lead time is
  // compared across the two subsets of the same scan, so the denominator cannot
  // drift between the coverage card and the lead-time card.
  const cardsResult = await db.execute(sql`
    SELECT
      COUNT(*) AS "mergedPrs",
      COUNT(*) FILTER (
        WHERE copilot_review.pull_request_id IS NOT NULL
      ) AS "copilotReviewedPrs",
      ROUND(
        COUNT(*) FILTER (WHERE copilot_review.pull_request_id IS NOT NULL)::numeric
        / NULLIF(COUNT(*), 0)
      , 4) AS "coverageShare",
      ROUND(
        AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 3600)
          FILTER (WHERE copilot_review.pull_request_id IS NOT NULL)::numeric
      , 2) AS "avgLeadTimeHoursWith",
      ROUND(
        AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 3600)
          FILTER (WHERE copilot_review.pull_request_id IS NULL)::numeric
      , 2) AS "avgLeadTimeHoursWithout"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    LEFT JOIN (
      SELECT DISTINCT prr.pull_request_id
      FROM pull_request_reviews prr
      WHERE ${isCopilotReview("prr")}
    ) copilot_review ON copilot_review.pull_request_id = pr.id
    WHERE ${repositoryIn("r.full_name", fullNames)}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND ${humanPullRequest("pr")}
  `);

  // --- Same card metrics over the preceding, equally-sized window ---
  // The Copilot review is matched on the pull request, not on when the review
  // was submitted, so a review that lands just before the window still counts.
  const previousValuesResult = await db.execute(sql`
    SELECT
      (SELECT ROUND(
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM pull_request_reviews prr
            WHERE prr.pull_request_id = pr.id AND ${isCopilotReview("prr")}
          ))::numeric / NULLIF(COUNT(*), 0)
        , 4)
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL
          AND ${humanPullRequest("pr")}) AS "previousCoverageShare",
      (SELECT COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM pull_request_reviews prr
            WHERE prr.pull_request_id = pr.id AND ${isCopilotReview("prr")}
          ))
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL
          AND ${humanPullRequest("pr")}) AS "previousCopilotReviewedPrs",
      (SELECT ROUND(
          AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 3600)::numeric
        , 2)
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.merged_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.merged_at IS NOT NULL
          AND ${humanPullRequest("pr")}
          AND EXISTS (
            SELECT 1 FROM pull_request_reviews prr
            WHERE prr.pull_request_id = pr.id AND ${isCopilotReview("prr")}
          )) AS "previousLeadTimeHoursWith",
      (SELECT COUNT(*)
        FROM commits c
        JOIN repositories r ON c.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND c.committer_date < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${copilotCoauthorTrailerMatch("c.message")}) AS "previousCopilotCoauthoredCommits",
      (SELECT COUNT(*)
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days * 2})
          AND pr.created_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.author = ${COPILOT_PR_AUTHOR}) AS "previousCopilotAuthoredPrs"
  `);

  // --- Coding agent and co-authorship (their own populations) ---
  // Counting agent pull requests needs no human-PR filter (the author is the
  // agent itself), and co-authored commits are counted on committer date so a
  // commit lands in the window it was written in.
  const activityResult = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.author = ${COPILOT_PR_AUTHOR}) AS "copilotAuthoredPrs",
      (SELECT COUNT(*)
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND pr.author = ${COPILOT_PR_AUTHOR}
          AND pr.merged_at IS NOT NULL) AS "copilotAuthoredMergedPrs",
      (SELECT COUNT(*)
        FROM commits c
        JOIN repositories r ON c.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${copilotCoauthorTrailerMatch("c.message")}) AS "copilotCoauthoredCommits",
      (SELECT COUNT(*)
        FROM commits c
        JOIN repositories r ON c.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})) AS "totalTeamCommits",
      (SELECT ROUND(
          COUNT(*) FILTER (WHERE ${copilotCoauthorTrailerMatch("c.message")})::numeric
          / NULLIF(COUNT(*), 0)
        , 4)
        FROM commits c
        JOIN repositories r ON c.repository_id = r.id
        WHERE ${repositoryIn("r.full_name", fullNames)}
          AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})) AS "coauthoredCommitShare"
  `);

  // --- Who reviewed the merged PRs: Copilot, a human, both, or neither ---
  // The population is the same merged-PR set as the coverage card, so the
  // "Copilot only" slice is directly comparable to the coverage percentage.
  const reviewCombinationResult = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE cop_exists AND human_exists) AS "copilotAndHuman",
      COUNT(*) FILTER (WHERE cop_exists AND NOT human_exists) AS "copilotOnly",
      COUNT(*) FILTER (WHERE NOT cop_exists AND human_exists) AS "humanOnly",
      COUNT(*) FILTER (WHERE NOT cop_exists AND NOT human_exists) AS "noReview"
    FROM (
      SELECT
        EXISTS (
          SELECT 1 FROM pull_request_reviews cop
          WHERE cop.pull_request_id = pr.id AND ${isCopilotReview("cop")}
        ) AS cop_exists,
        EXISTS (
          SELECT 1 FROM pull_request_reviews hum
          WHERE hum.pull_request_id = pr.id AND ${isHumanReview("hum", "pr")}
        ) AS human_exists
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE ${repositoryIn("r.full_name", fullNames)}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL
        AND ${humanPullRequest("pr")}
    ) reviewed
  `);

  // --- Copilot review adoption by pull-request size ---
  // Explains the lead-time gap: if Copilot reviews larger PRs, its "with
  // Copilot" lead time is higher by selection, not by slowdown.
  const prSizeBucketsResult = await db.execute(sql`
    SELECT
      CASE
        WHEN pr.additions IS NULL THEN 'unknown'
        WHEN pr.additions < 50 THEN '< 50'
        WHEN pr.additions < 200 THEN '50-199'
        WHEN pr.additions < 500 THEN '200-499'
        ELSE '500+'
      END AS bucket,
      COUNT(*) AS "mergedPrs",
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM pull_request_reviews cop
        WHERE cop.pull_request_id = pr.id AND ${isCopilotReview("cop")}
      )) AS "copilotReviewedPrs",
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM pull_request_reviews cop
          WHERE cop.pull_request_id = pr.id AND ${isCopilotReview("cop")}
        )) / NULLIF(COUNT(*), 0)
      , 1) AS "reviewRate"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE ${repositoryIn("r.full_name", fullNames)}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY bucket
    ORDER BY MIN(pr.additions) NULLS LAST
  `);

  // --- Weekly Copilot review activity ---
  const weeklyTrendResult = await db.execute(sql`
    SELECT DATE_TRUNC('week', prr.submitted_at)::date AS week,
      COUNT(*) AS reviews,
      COUNT(DISTINCT prr.pull_request_id) AS "reviewedPrs"
    FROM pull_request_reviews prr
    JOIN repositories r ON prr.repository_id = r.id
    WHERE ${repositoryIn("r.full_name", fullNames)}
      AND ${isCopilotReview("prr")}
      AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
    GROUP BY week
    ORDER BY week
  `);

  // --- Co-authored commits vs PR lead time, over time ---
  // One point per week, both populations scoped to the selected repositories.
  // Commits are bucketed by committer date and lead time by merge date, so the
  // two series answer "in weeks with more Copilot co-authorship, was delivery
  // faster or slower?". Correlation only: neither series causes the other.
  const coauthorLeadTimeTrendResult = await db.execute(sql`
    WITH bounds AS (
      SELECT
        DATE_TRUNC('week', ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))::date AS start_week,
        DATE_TRUNC('week', ${referenceDate}::timestamptz)::date AS end_week
    ),
    weeks AS (
      SELECT generate_series(start_week, end_week, '1 week'::interval)::date AS week
      FROM bounds
    ),
    commit_weeks AS (
      SELECT DATE_TRUNC('week', c.committer_date)::date AS week,
        COUNT(*) AS "coauthoredCommits"
      FROM commits c
      JOIN repositories r ON c.repository_id = r.id
      WHERE ${repositoryIn("r.full_name", fullNames)}
        AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${copilotCoauthorTrailerMatch("c.message")}
      GROUP BY 1
    ),
    pr_weeks AS (
      SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
        AVG(EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400) AS "avgLeadTimeDays"
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE ${repositoryIn("r.full_name", fullNames)}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL
        AND ${humanPullRequest("pr")}
      GROUP BY 1
    )
    SELECT weeks.week,
      COALESCE(commit_weeks."coauthoredCommits", 0) AS "coauthoredCommits",
      ROUND(pr_weeks."avgLeadTimeDays"::numeric, 2) AS "avgLeadTimeDays"
    FROM weeks
    LEFT JOIN commit_weeks ON commit_weeks.week = weeks.week
    LEFT JOIN pr_weeks ON pr_weeks.week = weeks.week
    ORDER BY weeks.week
  `);

  // --- Cumulative coverage over time ---
  // One point per week: how many merged pull requests had received a Copilot
  // review by the end of that week, versus how many had not. The two series
  // partition the same population, so the total is the merged-PR volume.
  const coverageTrendResult = await db.execute(sql`
    WITH weekly AS (
      SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id AND ${isCopilotReview("prr")}
        )) AS "withCopilot",
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id AND ${isCopilotReview("prr")}
        )) AS "withoutCopilot"
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE ${repositoryIn("r.full_name", fullNames)}
        AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL
        AND ${humanPullRequest("pr")}
      GROUP BY week
    )
    SELECT week,
      SUM("withCopilot") OVER (ORDER BY week) AS "cumulativeWith",
      SUM("withoutCopilot") OVER (ORDER BY week) AS "cumulativeWithout"
    FROM weekly
    ORDER BY week
  `);

  const commitsByRepositoryResult = await db.execute(sql`
    SELECT r.full_name AS repository, COUNT(*) AS commits
    FROM commits c
    JOIN repositories r ON c.repository_id = r.id
    WHERE ${repositoryIn("r.full_name", fullNames)}
      AND c.committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${copilotCoauthorTrailerMatch("c.message")}
    GROUP BY r.full_name
    ORDER BY commits DESC
  `);

  const recentAuthoredPrsResult = await db.execute(sql`
    SELECT pr.number,
      r.full_name AS repository,
      pr.title,
      pr.created_at AS "createdAt",
      pr.merged_at AS "mergedAt",
      ROUND(
        (EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400)::numeric
      , 2) AS "leadTimeDays"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE ${repositoryIn("r.full_name", fullNames)}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.author = ${COPILOT_PR_AUTHOR}
    ORDER BY pr.created_at DESC
    LIMIT 20
  `);

  const cards = parseSqlRow(
    copilotCardsSchema,
    {
      ...cardsResult.rows[0],
      ...previousValuesResult.rows[0],
      ...activityResult.rows[0],
    },
    "copilot cards",
  );

  const dashboard = {
    cards,
    coauthorLeadTimeTrend: parseSqlRows(
      copilotCoauthorLeadTimeRowSchema,
      coauthorLeadTimeTrendResult.rows,
      "copilot coauthorLeadTimeTrend",
    ),
    commitsByRepository: parseSqlRows(
      copilotCommitRepoRowSchema,
      commitsByRepositoryResult.rows,
      "copilot commitsByRepository",
    ),
    coverageTrend: parseSqlRows(
      copilotCoverageTrendRowSchema,
      coverageTrendResult.rows,
      "copilot coverageTrend",
    ),
    prSizeBuckets: parseSqlRows(
      copilotPrSizeRowSchema,
      prSizeBucketsResult.rows,
      "copilot prSizeBuckets",
    ),
    recentAuthoredPrs: parseSqlRows(
      copilotAuthoredPrRowSchema,
      recentAuthoredPrsResult.rows,
      "copilot recentAuthoredPrs",
    ),
    reviewCombination: parseSqlRow(
      copilotReviewCombinationSchema,
      reviewCombinationResult.rows[0],
      "copilot reviewCombination",
    ),
    weeklyTrend: parseSqlRows(
      copilotWeeklyTrendRowSchema,
      weeklyTrendResult.rows,
      "copilot weeklyTrend",
    ),
  };

  return {
    ...dashboard,
    insights: buildCopilotInsights(dashboard),
    meta: { days, referenceDate },
  };
};
