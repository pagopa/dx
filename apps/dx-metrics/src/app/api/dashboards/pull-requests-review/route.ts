import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repository = searchParams.get("repository") || "dx";
  const days = parseInt(searchParams.get("days") || "120");
  const org = process.env.ORGANIZATION || "pagopa";
  const fullName = `${org}/${repository}`;

  try {
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

    function numericRows<T extends Record<string, unknown>>(
      rows: T[],
      keys: string[],
    ): T[] {
      return rows.map((row) => {
        const out = { ...row };
        for (const k of keys) {
          if (out[k] != null)
            (out as Record<string, unknown>)[k] = Number(out[k]);
        }
        return out;
      });
    }

    return NextResponse.json({
      cards: {
        avgTimeToFirstReview:
          Number(avgTimeToFirstReview.rows[0]?.value) || null,
        avgTimeToMerge: Number(avgTimeToMerge.rows[0]?.value) || null,
      },
      timeToFirstReviewTrend: numericRows(timeToFirstReviewTrend.rows, [
        "avg_hours_to_first_review",
      ]),
      timeToMergeTrend: numericRows(timeToMergeTrend.rows, [
        "avg_hours_to_merge",
      ]),
      reviewDistribution: numericRows(reviewDistribution.rows, [
        "total_reviews",
        "approvals",
        "change_requests",
      ]),
      reviewMatrix: numericRows(reviewMatrix.rows, ["review_count"]),
    });
  } catch (error) {
    console.error("PR review dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
