/** SQL queries and data transformation for the pull-requests-review dashboard. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type {
  GetPullRequestsReviewDashboardInput,
  PullRequestsReviewDashboard,
} from "./schemas";

import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  reviewDistributionRowSchema,
  reviewMatrixRowSchema,
  reviewMetricValueRowSchema,
  timeToFirstReviewTrendRowSchema,
  timeToMergeTrendRowSchema,
} from "./schemas";

export const getPullRequestsReviewDashboard = async (
  db: Database,
  { days, fullName }: GetPullRequestsReviewDashboardInput,
): Promise<PullRequestsReviewDashboard> => {
  // --- Time to First Review ---
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
      AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND (pr.draft IS NULL OR pr.draft = 0)
  `);

  const timeToFirstReviewTrend = await db.execute(sql`
    SELECT DATE_TRUNC('week', pr.created_at)::date AS week,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (first_review.submitted_at - pr.created_at)) / 3600
      )::numeric, 2) AS avg_hours_to_first_review
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id
      ORDER BY submitted_at ASC LIMIT 1
    ) first_review ON true
    WHERE r.full_name = ${fullName}
      AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND (pr.draft IS NULL OR pr.draft = 0)
    GROUP BY week
    ORDER BY week
  `);

  // --- Time to Merge (last approval → merged_at) ---
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
      AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND (pr.draft IS NULL OR pr.draft = 0)
  `);

  const timeToMergeTrend = await db.execute(sql`
    SELECT DATE_TRUNC('week', pr.merged_at)::date AS week,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (pr.merged_at - last_approval.submitted_at)) / 3600
      )::numeric, 2) AS avg_hours_to_merge
    FROM pull_requests pr
    JOIN repositories r ON pr.repository_id = r.id
    JOIN LATERAL (
      SELECT submitted_at FROM pull_request_reviews prr
      WHERE prr.pull_request_id = pr.id AND prr.state = 'APPROVED'
      ORDER BY submitted_at DESC LIMIT 1
    ) last_approval ON true
    WHERE r.full_name = ${fullName}
      AND pr.merged_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND (pr.draft IS NULL OR pr.draft = 0)
    GROUP BY week
    ORDER BY week
  `);

  // --- Code Review Distribution ---
  const reviewDistribution = await db.execute(sql`
    SELECT reviewer,
      COUNT(*) AS total_reviews,
      COUNT(*) FILTER (WHERE state = 'APPROVED') AS approvals,
      COUNT(*) FILTER (WHERE state = 'CHANGES_REQUESTED') AS change_requests
    FROM pull_request_reviews prr
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND prr.submitted_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND reviewer NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
    GROUP BY reviewer
    ORDER BY total_reviews DESC
  `);

  const reviewMatrix = await db.execute(sql`
    SELECT pr.author, prr.reviewer, COUNT(*) AS review_count
    FROM pull_request_reviews prr
    JOIN pull_requests pr ON prr.pull_request_id = pr.id
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ${fullName}
      AND prr.submitted_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND pr.author NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND prr.reviewer NOT IN ('renovate-pagopa', 'dependabot', 'dx-pagopa-bot')
      AND (pr.draft IS NULL OR pr.draft = 0)
    GROUP BY pr.author, prr.reviewer
    ORDER BY review_count DESC
  `);

  const avgTimeToFirstReviewValue = parseSqlRow(
    reviewMetricValueRowSchema,
    avgTimeToFirstReview.rows[0],
    "pull-requests-review avgTimeToFirstReview",
  ).value;
  const avgTimeToMergeValue = parseSqlRow(
    reviewMetricValueRowSchema,
    avgTimeToMerge.rows[0],
    "pull-requests-review avgTimeToMerge",
  ).value;

  return {
    cards: {
      avgTimeToFirstReview: avgTimeToFirstReviewValue,
      avgTimeToMerge: avgTimeToMergeValue,
    },
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
};
