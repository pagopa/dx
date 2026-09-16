/** SQL queries and data transformation for the pull-requests-review dashboard. */

import { sql } from "drizzle-orm";

import { buildPullRequestsReviewInsights } from "@/lib/insights/pull-requests-review";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type {
  GetPullRequestsReviewDashboardInput,
  PullRequestsReviewDashboard,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { humanPullRequest, isHumanReview } from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import { percentileRowSchema } from "../shared/schemas";
import {
  commentSummaryRowSchema,
  mergedWithoutActivityShareRowSchema,
  reviewDistributionRowSchema,
  reviewMatrixRowSchema,
  reviewMetricValueRowSchema,
  timeToFirstReviewTrendRowSchema,
  timeToMergeTrendRowSchema,
} from "./schemas";

export const getPullRequestsReviewDashboard = async (
  db: Database,
  { days, fullName }: GetPullRequestsReviewDashboardInput,
): Promise<PullRequestsReviewDashboard & WithInsights & WithMeta> => {
  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({
      column: "GREATEST(pr.created_at, pr.merged_at)",
      from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
      where: sql`r.full_name = ${fullName}`,
    }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "pull-requests-review referenceDate",
  );

  // --- Time to First Review (population: PRs created in the window) ---
  // The "first review" is the earliest review from a human who is not the
  // author: bot comments and self-comments are not reviews.
  const avgTimeToFirstReview = await db.execute(sql`
    SELECT ROUND(AVG(
      EXTRACT(EPOCH FROM (first_review.submitted_at - pr.created_at)) / 3600
    )::numeric, 2) AS value
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id
        AND ${isHumanReview("prr", "pr")}
      ORDER BY submitted_at ASC LIMIT 1
    ) first_review ON true
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
  `);

  const timeToFirstReviewTrend = await db.execute(sql`
    SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (first_review.submitted_at - pr.created_at)) / 3600
      )::numeric, 2) AS "avgHoursToFirstReview"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id
        AND ${isHumanReview("prr", "pr")}
      ORDER BY submitted_at ASC LIMIT 1
    ) first_review ON true
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
    GROUP BY week
    ORDER BY week
  `);

  // --- Time to Merge (population: PRs merged in the window, with a human approval) ---
  const avgTimeToMerge = await db.execute(sql`
    SELECT ROUND(AVG(
      EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600
    )::numeric, 2) AS value
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
        AND ${isHumanReview("prr", "pr")}
      ORDER BY submitted_at DESC LIMIT 1
    ) last_approval ON true
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
  `);

  const timeToMergeTrend = await db.execute(sql`
    SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600
      )::numeric, 2) AS "avgHoursToMerge"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
        AND ${isHumanReview("prr", "pr")}
      ORDER BY submitted_at DESC LIMIT 1
    ) last_approval ON true
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
    GROUP BY week
    ORDER BY week
  `);

  // --- First-review time distribution ---
  const firstReviewPercentiles = await db.execute(sql`
    SELECT
      COUNT(*) AS "count",
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours)::numeric, 2) AS "p50",
      ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (ORDER BY hours)::numeric, 2) AS "p85",
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY hours)::numeric, 2) AS "p95"
    FROM (
      SELECT EXTRACT(EPOCH FROM (first_review.submitted_at - pr.created_at)) / 3600 AS hours
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      JOIN LATERAL (
        SELECT submitted_at FROM pull_request_reviews prr
        WHERE prr.pull_request_id = pr.id
          AND ${isHumanReview("prr", "pr")}
        ORDER BY submitted_at ASC LIMIT 1
      ) first_review ON true
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
    ) first_review_hours
  `);

  // --- Share of merged PRs without any human review / without comments ---
  // Population: PRs merged in the window. Bot reviews and self-comments do not
  // count as reviews, matching `reviewMatrix` and `reviewDistribution`. Both
  // shares come from a single scan of the same population so they cannot
  // disagree on the denominator.
  const mergedWithoutActivityShare = await db.execute(sql`
    SELECT
      ROUND(
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM pull_request_reviews prr
            WHERE prr.pull_request_id = pr.id
              AND ${isHumanReview("prr", "pr")}
          )
        )::numeric / NULLIF(COUNT(*), 0)
      , 4) AS "withoutReview",
      ROUND(
        COUNT(*) FILTER (
          WHERE COALESCE(pr.total_comments_count, 0) = 0
        )::numeric / NULLIF(COUNT(*), 0)
      , 4) AS "withoutComments"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND ${humanPullRequest("pr")}
  `);

  // --- Code Review Distribution ---
  // Same population as `reviewMatrix`: pull requests opened by a human (not a
  // bot, not a draft) with a human review from someone other than the author.
  // Without it, a human author reviewing their own PR or a review on a bot PR
  // inflates the distribution and the bus-factor insight built from it.
  const reviewDistribution = await db.execute(sql`
    SELECT prr.reviewer,
      COUNT(*) AS "totalReviews",
      COUNT(*) FILTER (WHERE state = 'APPROVED') AS approvals,
      COUNT(*) FILTER (WHERE state = 'CHANGES_REQUESTED') AS "changeRequests"
    FROM pull_request_reviews prr
    JOIN pull_requests pr ON prr.pull_request_id = pr.id
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
      AND ${isHumanReview("prr", "pr")}
    GROUP BY reviewer
    ORDER BY "totalReviews" DESC
  `);

  const reviewMatrix = await db.execute(sql`
    SELECT pr.author, prr.reviewer, COUNT(*) AS "reviewCount"
    FROM pull_request_reviews prr
    JOIN pull_requests pr ON prr.pull_request_id = pr.id
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
      AND ${isHumanReview("prr", "pr")}
    GROUP BY pr.author, prr.reviewer
    ORDER BY "reviewCount" DESC
  `);

  // --- Comment volume ---
  // The data model only stores a per-PR aggregate (`total_comments_count`),
  // with no per-comment author or timestamp. The cards therefore report the
  // comments recorded on the pull requests opened in the window; they cannot
  // separate human from bot comments, nor restrict the count to the exact days.
  // One scan produces both the total and its per-PR average so the two cards
  // share a denominator and cannot disagree.
  const commentSummaryResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(pr.total_comments_count), 0) AS "totalComments",
      ROUND(SUM(pr.total_comments_count)::numeric / NULLIF(COUNT(*), 0), 2) AS "commentsPerPr"
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
  `);
  const commentSummary = parseSqlRow(
    commentSummaryRowSchema,
    commentSummaryResult.rows[0],
    "pull-requests-review commentSummary",
  );

  const dashboard = {
    cards: {
      avgTimeToFirstReview: parseSqlRow(
        reviewMetricValueRowSchema,
        avgTimeToFirstReview.rows[0],
        "pull-requests-review avgTimeToFirstReview",
      ).value,
      avgTimeToMerge: parseSqlRow(
        reviewMetricValueRowSchema,
        avgTimeToMerge.rows[0],
        "pull-requests-review avgTimeToMerge",
      ).value,
      commentsPerPr: commentSummary.commentsPerPr,
      totalComments: commentSummary.totalComments,
    },
    firstReviewPercentiles: parseSqlRow(
      percentileRowSchema,
      firstReviewPercentiles.rows[0],
      "pull-requests-review firstReviewPercentiles",
    ),
    mergedWithoutCommentsShare: parseSqlRow(
      mergedWithoutActivityShareRowSchema,
      mergedWithoutActivityShare.rows[0],
      "pull-requests-review mergedWithoutCommentsShare",
    ).withoutComments,
    mergedWithoutReviewShare: parseSqlRow(
      mergedWithoutActivityShareRowSchema,
      mergedWithoutActivityShare.rows[0],
      "pull-requests-review mergedWithoutReviewShare",
    ).withoutReview,
    reviewDistribution: parseSqlRows(
      reviewDistributionRowSchema,
      reviewDistribution.rows,
      "pull-requests-review reviewDistribution",
    ),
    reviewMatrix: parseSqlRows(
      reviewMatrixRowSchema,
      reviewMatrix.rows,
      "pull-requests-review reviewMatrix",
    ),
    timeToFirstReviewTrend: parseSqlRows(
      timeToFirstReviewTrendRowSchema,
      timeToFirstReviewTrend.rows,
      "pull-requests-review timeToFirstReviewTrend",
    ),
    timeToMergeTrend: parseSqlRows(
      timeToMergeTrendRowSchema,
      timeToMergeTrend.rows,
      "pull-requests-review timeToMergeTrend",
    ),
  };

  return {
    ...dashboard,
    insights: buildPullRequestsReviewInsights(dashboard),
    meta: { days, referenceDate },
  };
};
