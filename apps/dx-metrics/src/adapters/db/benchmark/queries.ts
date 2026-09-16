/** Cross-repository benchmark queries for the benchmark dashboard. */

import { sql, type SQL } from "drizzle-orm";

import {
  buildBenchmarkMetric,
  type BenchmarkMetric,
  type BenchmarkValueRow,
} from "@/lib/benchmark";

import type { Database } from "../shared/types";
import type {
  BenchmarkInput,
  PrBenchmarkRow,
  WorkflowBenchmarkRow,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { parseSqlRows } from "../shared/sql-parsing";
import {
  botAuthorsExclusion,
  isHumanReview,
  textArray,
  workflowNameExclusion,
} from "../shared/sql-fragments";
import { prBenchmarkRowSchema, workflowBenchmarkRowSchema } from "./schemas";

/** Result of the cross-repository benchmark. */
export interface BenchmarkResult {
  readonly meta: { readonly days: number; readonly referenceDate: string };
  readonly metrics: readonly BenchmarkMetric[];
}

const laterDate = (left: string, right: string): string =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;

/**
 * Ensures every configured repository appears in a metric, with `null` when it
 * has no data. Keeps the benchmark tables aligned and lets the reader always
 * see where a repository stands.
 */
const padRows = (
  repositories: readonly string[],
  rows: readonly BenchmarkValueRow[],
): BenchmarkValueRow[] => {
  const byRepository = new Map(rows.map((row) => [row.repository, row]));

  return repositories.map((repository) => {
    const row = byRepository.get(repository);

    return {
      count: row?.count ?? null,
      repository,
      value: row?.value ?? null,
    };
  });
};

/** Latest PR and workflow activity dates, used to anchor benchmark windows. */
interface BenchmarkReferenceDates {
  readonly prReference: string;
  readonly wrReference: string;
}

const fetchReferenceDates = async (
  db: Database,
): Promise<BenchmarkReferenceDates> => {
  const [prReferenceResult, wrReferenceResult] = await Promise.all([
    db.execute(
      buildReferenceDateQuery({
        column: "GREATEST(pr.created_at, pr.merged_at)",
        from: "pull_requests pr",
      }),
    ),
    db.execute(
      buildReferenceDateQuery({
        column: "wr.created_at",
        from: "workflow_runs wr",
      }),
    ),
  ]);

  return {
    prReference: parseReferenceDate(
      prReferenceResult.rows[0],
      "benchmark pr referenceDate",
    ),
    wrReference: parseReferenceDate(
      wrReferenceResult.rows[0],
      "benchmark wr referenceDate",
    ),
  };
};

const fetchPrBenchmarkRows = async (
  db: Database,
  repositories: SQL,
  days: number,
  prReference: string,
): Promise<PrBenchmarkRow[]> => {
  const result = await db.execute(sql`
    WITH pr AS (
      SELECT r.name AS repository,
        EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400 AS lead_days,
        COALESCE(pr.total_comments_count, 0) AS comments,
        NOT EXISTS (
          SELECT 1 FROM pull_request_reviews rr
          WHERE rr.pull_request_id = pr.id
            AND ${isHumanReview("rr", "pr")}
        ) AS no_review
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.name = ANY(${repositories})
        AND pr.merged_at >= ${prReference}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
        AND ${botAuthorsExclusion("pr.author")}
        AND (pr.draft IS NULL OR pr.draft = 0)
    )
    SELECT repository,
      COUNT(*) AS "count",
      ROUND(AVG(lead_days)::numeric, 2) AS "leadTime",
      ROUND(COUNT(*) FILTER (WHERE no_review)::numeric
            / NULLIF(COUNT(*), 0) * 100, 2) AS "mergedWithoutReview",
      ROUND(COUNT(*) FILTER (WHERE comments = 0)::numeric
            / NULLIF(COUNT(*), 0) * 100, 2) AS "mergedWithoutComments"
    FROM pr GROUP BY repository
  `);

  return parseSqlRows(prBenchmarkRowSchema, result.rows, "benchmark pr");
};

const fetchWorkflowBenchmarkRows = async (
  db: Database,
  repositories: SQL,
  days: number,
  wrReference: string,
): Promise<WorkflowBenchmarkRow[]> => {
  const result = await db.execute(sql`
    SELECT r.name AS repository,
      COUNT(*) AS "count",
      ROUND((AVG(EXTRACT(EPOCH FROM (wr.updated_at - wr.created_at)))
        FILTER (WHERE TRIM(wr.conclusion) = 'success') / 60)::numeric, 2) AS "pipelineDuration",
      ROUND(
        (COUNT(*) FILTER (WHERE TRIM(wr.conclusion) = 'success'))::numeric
        / NULLIF(COUNT(*) FILTER (WHERE TRIM(wr.conclusion) IN ('success', 'failure')), 0) * 100
      , 2) AS "successRate"
    FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    JOIN repositories r ON wr.repository_id = r.id
    WHERE r.name = ANY(${repositories})
      AND wr.status = 'completed'
      AND wr.updated_at >= ${wrReference}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND wr.updated_at <= ${wrReference}::timestamptz
      AND ${workflowNameExclusion("w.name")}
    GROUP BY r.name
  `);

  return parseSqlRows(workflowBenchmarkRowSchema, result.rows, "benchmark workflow");
};

/**
 * Computes organisation-wide benchmark metrics (per-repository values plus the
 * organisation median) so a reader can judge a single repository against peers.
 */
export const getBenchmarkDashboard = async (
  db: Database,
  { configuredRepositories, days }: BenchmarkInput,
): Promise<BenchmarkResult> => {
  const { prReference, wrReference } = await fetchReferenceDates(db);

  const repositories = textArray(configuredRepositories);

  const [prRows, workflowRows] = await Promise.all([
    fetchPrBenchmarkRows(db, repositories, days, prReference),
    fetchWorkflowBenchmarkRows(db, repositories, days, wrReference),
  ]);

  const metrics = [
    buildBenchmarkMetric({
      category: "delivery",
      key: "leadTime",
      label: "Avg lead time",
      lowerIsBetter: true,
      rows: padRows(
        configuredRepositories,
        prRows.map((row) => ({
          count: row.count,
          repository: row.repository,
          value: row.leadTime,
        })),
      ),
      unit: "days",
    }),
    buildBenchmarkMetric({
      category: "delivery",
      key: "pipelineDuration",
      label: "Avg pipeline duration",
      lowerIsBetter: true,
      rows: padRows(
        configuredRepositories,
        workflowRows.map((row) => ({
          count: row.count,
          repository: row.repository,
          value: row.pipelineDuration,
        })),
      ),
      unit: "min",
    }),
    buildBenchmarkMetric({
      category: "quality",
      key: "successRate",
      label: "Workflow success rate",
      lowerIsBetter: false,
      rows: padRows(
        configuredRepositories,
        workflowRows.map((row) => ({
          count: row.count,
          repository: row.repository,
          value: row.successRate,
        })),
      ),
      unit: "%",
    }),
    buildBenchmarkMetric({
      category: "quality",
      key: "mergedWithoutReview",
      label: "Merged without review",
      lowerIsBetter: true,
      rows: padRows(
        configuredRepositories,
        prRows.map((row) => ({
          count: row.count,
          repository: row.repository,
          value: row.mergedWithoutReview,
        })),
      ),
      unit: "%",
    }),
    buildBenchmarkMetric({
      category: "quality",
      key: "mergedWithoutComments",
      label: "Merged without comments",
      lowerIsBetter: true,
      rows: padRows(
        configuredRepositories,
        prRows.map((row) => ({
          count: row.count,
          repository: row.repository,
          value: row.mergedWithoutComments,
        })),
      ),
      unit: "%",
    }),
  ];

  return {
    meta: { days, referenceDate: laterDate(prReference, wrReference) },
    metrics,
  };
};

/**
 * Lead-time-only benchmark, reused by the Pull Requests dashboard to anchor a
 * repository's average to its peers without running the whole benchmark
 * adapter (workflow metrics included there are irrelevant to PR insights).
 */
export const getPrLeadTimeBenchmark = async (
  db: Database,
  { configuredRepositories, days }: BenchmarkInput,
): Promise<BenchmarkMetric> => {
  const prReference = parseReferenceDate(
    (
      await db.execute(
        buildReferenceDateQuery({
          column: "GREATEST(pr.created_at, pr.merged_at)",
          from: "pull_requests pr",
        }),
      )
    ).rows[0],
    "benchmark pr referenceDate",
  );

  const prRows = await fetchPrBenchmarkRows(
    db,
    textArray(configuredRepositories),
    days,
    prReference,
  );

  return buildBenchmarkMetric({
    category: "delivery",
    key: "leadTime",
    label: "Avg lead time",
    lowerIsBetter: true,
    rows: padRows(
      configuredRepositories,
      prRows.map((row) => ({
        count: row.count,
        repository: row.repository,
        value: row.leadTime,
      })),
    ),
    unit: "days",
  });
};
