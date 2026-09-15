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
import { botAuthorsExclusion } from "../shared/sql-fragments";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import { percentileRowSchema } from "../shared/schemas";
import {
  reviewDistributionRowSchema,
  reviewMatrixRowSchema,
  reviewMetricValueRowSchema,
  timeToFirstReviewTrendRowSchema,
  timeToMergeTrendRowSchema,
} from "./schemas";

/** Human, non-draft pull requests, the population every review metric uses. */
const HUMAN_PR = sql`${botAuthorsExclusion("pr.author")} AND (pr.draft IS NULL OR pr.draft = 0)`;

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

  // --- Time to First Review (PRs created in the window) ---
  const avgTimeToFirstReview = await db.execute(sql`
    SELECT ROUND(AVG(
      EXTRACT(EPOCH FROM (first_review.submitted_at - pr.created_at)) / 3600
    )::numeric, 2) AS value
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id
      ORDER BY submitted_at ASC LIMIT 1
    ) first_review ON true
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${HUMAN_PR}
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
      ORDER BY submitted_at ASC LIMIT 1
    ) first_review ON true
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${HUMAN_PR}
    GROUP BY week
    ORDER BY week
  `);

  // --- Time to Merge (last approval -> merged_at, PRs merged in the window) ---
  const avgTimeToMerge = await db.execute(sql`
    SELECT ROUND(AVG(
      EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600
    )::numeric, 2) AS value
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
      ORDER BY submitted_at DESC LIMIT 1
    ) last_approval ON true
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${HUMAN_PR}
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
      ORDER BY submitted_at DESC LIMIT 1
    ) last_approval ON true
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${HUMAN_PR}
    GROUP BY week
    ORDER BY week
  `);

  // --- First-review time distribution ---
  const firstReviewPercentiles = await db.execute(sql`
    SELECT
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
        ORDER BY submitted_at ASC LIMIT 1
      ) first_review ON true
      WHERE r.full_name = ${fullName}
        AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND ${HUMAN_PR}
    ) first_review_hours
  `);

  // --- Share of merged PRs without any review ---
  const mergedWithoutReviewShare = await db.execute(sql`
    SELECT ROUND(
      COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM pull_request_reviews prr WHERE prr.pull_request_id = pr.id
        )
      )::numeric / NULLIF(COUNT(*), 0)
    , 4) AS value
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND ${HUMAN_PR}
  `);

  // --- Code Review Distribution ---
  const reviewDistribution = await db.execute(sql`
    SELECT reviewer,
      COUNT(*) AS "totalReviews",
      COUNT(*) FILTER (WHERE state = 'APPROVED') AS approvals,
      COUNT(*) FILTER (WHERE state = 'CHANGES_REQUESTED') AS "changeRequests"
    FROM pull_request_reviews prr
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${botAuthorsExclusion("reviewer")}
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
      AND ${HUMAN_PR}
      AND ${botAuthorsExclusion("prr.reviewer")}
    GROUP BY pr.author, prr.reviewer
    ORDER BY "reviewCount" DESC
  `);

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
    },
    firstReviewPercentiles: parseSqlRow(
      percentileRowSchema,
      firstReviewPercentiles.rows[0],
      "pull-requests-review firstReviewPercentiles",
    ),
    mergedWithoutReviewShare: parseSqlRow(
      reviewMetricValueRowSchema,
      mergedWithoutReviewShare.rows[0],
      "pull-requests-review mergedWithoutReviewShare",
    ).value,
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
