/** Cross-repository review and collaboration queries for the collaboration dashboard. */

import { sql } from "drizzle-orm";

import { METRIC_TARGETS } from "@/lib/config";
import { buildCollaborationInsights } from "@/lib/insights/collaboration";
import type { WithInsights } from "@/lib/insights/types";
import { median } from "@/lib/stats";

import type { Database, WithMeta } from "../shared/types";
import type {
  CollaborationDashboard,
  CollaborationReviewRoundsRow,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import {
  botAuthorsExclusion,
  humanPullRequest,
  isHumanReview,
  textArray,
} from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  collaborationAwaitingReviewRowSchema,
  collaborationAwaitingSummaryRowSchema,
  collaborationMatrixRowSchema,
  collaborationMetricValueRowSchema,
  collaborationReviewRoundsRowSchema,
  collaborationReviewerLoadRowSchema,
  collaborationReviewerShareRowSchema,
  collaborationSelfReviewRowSchema,
  collaborationReviewTrendRowSchema,
} from "./schemas";

/**
 * Expands the per-PR review counts and takes their median with the shared
 * `median` helper, so the card and the insight cannot disagree.
 */
const buildMedianReviewRounds = (
  rows: readonly CollaborationReviewRoundsRow[],
): null | number => {
  const counts: number[] = [];

  for (const row of rows) {
    for (let index = 0; index < row.prCount; index += 1) {
      counts.push(row.reviewCount);
    }
  }

  return median(counts);
};

/**
 * Computes organisation-wide review and collaboration metrics across every
 * configured repository. Every metric shares the same population rules:
 * human (non-bot, non-draft) pull requests and human reviews (a reviewer who
 * is neither a bot nor the author).
 */
export const getCollaborationDashboard = async (
  db: Database,
  { days, repositories }: { days: number; repositories: readonly string[] },
): Promise<CollaborationDashboard & WithInsights & WithMeta> => {
  const repositoryArray = textArray(repositories);

  const referenceDate = parseReferenceDate(
    (
      await db.execute(
        buildReferenceDateQuery({
          column: "GREATEST(pr.created_at, pr.merged_at)",
          from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
          where: sql`r.full_name = ANY(${repositoryArray})`,
        }),
      )
    ).rows[0],
    "collaboration referenceDate",
  );

  const [
    avgTimeToFirstReviewResult,
    reviewerShareResult,
    awaitingSummaryResult,
    reviewRoundsResult,
    reviewerLoadResult,
    selfReviewResult,
    awaitingReviewResult,
    collaborationMatrixResult,
    reviewTrendResult,
  ] = await Promise.all([
    // Average time to the first human review, over PRs created in the window.
    db.execute(sql`
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
      WHERE r.full_name = ANY(${repositoryArray})
        AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
    `),
    // Total reviews, busiest-reviewer share and churn share from one scan.
    db.execute(sql`
      WITH per_reviewer AS (
        SELECT prr.reviewer,
          COUNT(*) AS reviews,
          COUNT(*) FILTER (WHERE prr.state = 'CHANGES_REQUESTED') AS "changeRequests",
          COUNT(*) FILTER (WHERE prr.state = 'DISMISSED') AS dismissals
        FROM pull_request_reviews prr
        JOIN pull_requests pr ON prr.pull_request_id = pr.id
        JOIN repositories r ON prr.repository_id = r.id
        WHERE r.full_name = ANY(${repositoryArray})
          AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}
          AND ${isHumanReview("prr", "pr")}
        GROUP BY prr.reviewer
      )
      SELECT
        COALESCE(SUM(reviews), 0) AS "totalReviews",
        COALESCE(SUM("changeRequests"), 0) AS "changeRequests",
        COALESCE(SUM(dismissals), 0) AS "dismissals",
        ROUND(
          COALESCE(MAX(reviews), 0)::numeric / NULLIF(SUM(reviews), 0)::numeric
        , 4) AS "topReviewerShare",
        ROUND(
          (COALESCE(SUM("changeRequests"), 0) + COALESCE(SUM(dismissals), 0))::numeric
          / NULLIF(SUM(reviews), 0)::numeric
        , 4) AS "churnShare"
      FROM per_reviewer
    `),
    // Point-in-time size of the review queue and how much of it is overdue.
    db.execute(sql`
      SELECT
        COUNT(*) AS "awaitingReviewCount",
        COUNT(*) FILTER (
          WHERE pr.created_at < ${referenceDate}::timestamptz - MAKE_INTERVAL(hours => ${METRIC_TARGETS.timeToFirstReviewHours})
        ) AS "overdueAwaitingCount"
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ANY(${repositoryArray})
        AND pr.merged_at IS NULL
        AND pr.closed_at IS NULL
        AND pr.created_at IS NOT NULL
        AND ${humanPullRequest("pr")}
        AND NOT EXISTS (
          SELECT 1 FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id
            AND prr.state = 'APPROVED'
            AND ${isHumanReview("prr", "pr")}
        )
    `),
    // Human reviews per PR created in the window, grouped by exact count.
    db.execute(sql`
      SELECT review_count AS "reviewCount", COUNT(*) AS "prCount"
      FROM (
        SELECT pr.id, COUNT(prr.id) AS review_count
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        LEFT JOIN pull_request_reviews prr
          ON prr.pull_request_id = pr.id
          AND ${isHumanReview("prr", "pr")}
        WHERE r.full_name = ANY(${repositoryArray})
          AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
          AND ${humanPullRequest("pr")}
        GROUP BY pr.id
      ) per_pr
      GROUP BY review_count
      ORDER BY review_count
    `),
    // Per-reviewer workload and outcome mix, busiest first.
    db.execute(sql`
      SELECT prr.reviewer,
        COUNT(*) AS "totalReviews",
        COUNT(*) FILTER (WHERE prr.state = 'APPROVED') AS approvals,
        COUNT(*) FILTER (WHERE prr.state = 'CHANGES_REQUESTED') AS "changeRequests",
        COUNT(*) FILTER (WHERE prr.state = 'DISMISSED') AS dismissals,
        COUNT(*) FILTER (WHERE prr.state = 'COMMENTED') AS comments
      FROM pull_request_reviews prr
      JOIN pull_requests pr ON prr.pull_request_id = pr.id
      JOIN repositories r ON prr.repository_id = r.id
      WHERE r.full_name = ANY(${repositoryArray})
        AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
        AND ${isHumanReview("prr", "pr")}
      GROUP BY prr.reviewer
      ORDER BY "totalReviews" DESC, prr.reviewer
    `),
    // Reviews split by whether the reviewer authored the PR. Unlike the other
    // review queries, this one deliberately does NOT apply `isHumanReview`:
    // self-reviews are exactly what it needs to count. It still uses
    // `humanPullRequest` so "reviews on others' PRs" reconciles with the
    // reviewer-load table, and excludes bot reviewers. GitHub does not allow
    // approving your own PR, so `ownReviews` are self-comments, not approvals.
    db.execute(sql`
      SELECT prr.reviewer AS login,
        COUNT(*) FILTER (WHERE prr.reviewer <> pr.author) AS "otherReviews",
        COUNT(*) FILTER (WHERE prr.reviewer = pr.author) AS "ownReviews"
      FROM pull_request_reviews prr
      JOIN pull_requests pr ON prr.pull_request_id = pr.id
      JOIN repositories r ON prr.repository_id = r.id
      WHERE r.full_name = ANY(${repositoryArray})
        AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
        AND ${botAuthorsExclusion("prr.reviewer")}
      GROUP BY prr.reviewer
      HAVING COUNT(*) FILTER (WHERE prr.reviewer = pr.author) > 0
      ORDER BY "ownReviews" DESC, login
    `),
    // Oldest open PRs still waiting for a first human approval.
    db.execute(sql`
      SELECT r.full_name AS repository, pr.number, pr.title, pr.author,
        ROUND(EXTRACT(EPOCH FROM (${referenceDate}::timestamptz - pr.created_at)) / 86400, 1) AS "ageDays",
        pr.review_decision AS "reviewDecision"
      FROM pull_requests pr
      JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ANY(${repositoryArray})
        AND pr.merged_at IS NULL
        AND pr.closed_at IS NULL
        AND pr.created_at IS NOT NULL
        AND ${humanPullRequest("pr")}
        AND NOT EXISTS (
          SELECT 1 FROM pull_request_reviews prr
          WHERE prr.pull_request_id = pr.id
            AND prr.state = 'APPROVED'
            AND ${isHumanReview("prr", "pr")}
        )
      ORDER BY pr.created_at ASC, pr.number
      LIMIT 25
    `),
    // Who reviews whom, bounded so a wide org stays readable.
    db.execute(sql`
      SELECT pr.author, prr.reviewer, COUNT(*) AS "reviewCount"
      FROM pull_request_reviews prr
      JOIN pull_requests pr ON prr.pull_request_id = pr.id
      JOIN repositories r ON prr.repository_id = r.id
      WHERE r.full_name = ANY(${repositoryArray})
        AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
        AND ${isHumanReview("prr", "pr")}
      GROUP BY pr.author, prr.reviewer
      ORDER BY "reviewCount" DESC, pr.author, prr.reviewer
      LIMIT 200
    `),
    // Weekly average time to first review for the trend chart.
    db.execute(sql`
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
      WHERE r.full_name = ANY(${repositoryArray})
        AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${humanPullRequest("pr")}
      GROUP BY week
      ORDER BY week
    `),
  ]);

  const reviewerShare = parseSqlRow(
    collaborationReviewerShareRowSchema,
    reviewerShareResult.rows[0],
    "collaboration reviewerShare",
  );
  const awaitingSummary = parseSqlRow(
    collaborationAwaitingSummaryRowSchema,
    awaitingSummaryResult.rows[0],
    "collaboration awaitingSummary",
  );
  const medianReviewRounds = buildMedianReviewRounds(
    parseSqlRows(
      collaborationReviewRoundsRowSchema,
      reviewRoundsResult.rows,
      "collaboration reviewRounds",
    ),
  );

  const reviewerBehaviour = parseSqlRows(
    collaborationSelfReviewRowSchema,
    selfReviewResult.rows,
    "collaboration reviewerBehaviour",
  );
  const selfReviewCount = reviewerBehaviour.reduce(
    (sum, row) => sum + row.ownReviews,
    0,
  );
  // Denominator includes self-reviews, which `reviewerShare.totalReviews`
  // deliberately excludes, so the share describes all review activity.
  const reviewsIncludingSelf = reviewerShare.totalReviews + selfReviewCount;
  const selfReviewShare =
    reviewsIncludingSelf > 0
      ? Math.round((selfReviewCount / reviewsIncludingSelf) * 10_000) / 10_000
      : null;

  const dashboard = {
    awaitingReview: parseSqlRows(
      collaborationAwaitingReviewRowSchema,
      awaitingReviewResult.rows,
      "collaboration awaitingReview",
    ),
    collaborationMatrix: parseSqlRows(
      collaborationMatrixRowSchema,
      collaborationMatrixResult.rows,
      "collaboration collaborationMatrix",
    ),
    reviewTrend: parseSqlRows(
      collaborationReviewTrendRowSchema,
      reviewTrendResult.rows,
      "collaboration reviewTrend",
    ),
    reviewerBehaviour,
    reviewerLoad: parseSqlRows(
      collaborationReviewerLoadRowSchema,
      reviewerLoadResult.rows,
      "collaboration reviewerLoad",
    ),
    summary: {
      avgTimeToFirstReviewHours: parseSqlRow(
        collaborationMetricValueRowSchema,
        avgTimeToFirstReviewResult.rows[0],
        "collaboration avgTimeToFirstReview",
      ).value,
      awaitingReviewCount: awaitingSummary.awaitingReviewCount,
      churnShare: reviewerShare.churnShare,
      medianReviewRounds,
      overdueAwaitingCount: awaitingSummary.overdueAwaitingCount,
      selfReviewCount,
      selfReviewShare,
      topReviewerShare: reviewerShare.topReviewerShare,
      totalReviews: reviewerShare.totalReviews,
    },
  };

  return {
    ...dashboard,
    insights: buildCollaborationInsights(dashboard),
    meta: { days, referenceDate },
  };
};
