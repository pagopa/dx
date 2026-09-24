/** Shared, parameter-safe SQL fragments reused across dashboard adapters. */

import { sql, type SQL } from "drizzle-orm";

import {
  BOT_AUTHORS,
  DX_REPO,
  EXCLUDED_WORKFLOW_NAMES,
  ORGANIZATION,
  WEEKLY_BUCKET_THRESHOLD_DAYS,
} from "@/lib/config";

/** Full name of the DX repository (e.g. `pagopa/dx`), the source of DX pipelines. */
const DX_REPOSITORY_FULL_NAME = `${ORGANIZATION}/${DX_REPO}`;

/**
 * Renders a column expression, accepting either raw text or a bound fragment.
 */
const asFragment = (expression: SQL | string): SQL =>
  typeof expression === "string" ? sql.raw(expression) : expression;

/**
 * Builds a predicate that excludes bot accounts.
 *
 * GitHub App bots always end with `[bot]` (e.g. `renovate-pagopa[bot]`), so we
 * exclude that pattern generically in addition to the explicit list. Without
 * this, new bots silently inflate the metrics.
 */
export const botAuthorsExclusion = (column: string): SQL =>
  sql`(${notInValues(column, BOT_AUTHORS)} AND ${sql.raw(column)} NOT LIKE '%[bot]')`;

/**
 * Predicate matching reviews that count as a real human review: a reviewer who
 * is neither a bot nor the pull-request author.
 *
 * Without it, a bot comment (e.g. Renovate) or the author's own comment is
 * picked up as the "first review", collapsing review-latency metrics to ~0 and
 * inflating the review count. Every review-based metric must use this predicate
 * so the review dashboards and the benchmark agree on what a review is.
 */
export const isHumanReview = (reviewAlias: string, authorAlias: string): SQL =>
  sql`${botAuthorsExclusion(`${reviewAlias}.reviewer`)} AND ${sql.raw(reviewAlias)}.reviewer <> ${sql.raw(authorAlias)}.author`;

/**
 * The single population every pull-request metric is computed on: pull requests
 * opened by a human (not a bot) and not marked as draft. Shared so the PR,
 * PR-review, and benchmark adapters cannot drift apart on what counts as a
 * "real" pull request.
 */
export const humanPullRequest = (alias: string): SQL =>
  sql`(${botAuthorsExclusion(`${alias}.author`)} AND (${sql.raw(alias)}.draft IS NULL OR ${sql.raw(alias)}.draft = 0))`;

/**
 * Excludes tooling workflow names (e.g. "CodeQL", "Labeler") from a workflow
 * name column. Centralised with the list in the shared config so the workflow
 * dashboards, the DX adoption pie, and the benchmark agree on what a workflow
 * run is.
 */
export const workflowNameExclusion = (column: string): SQL =>
  notInValues(column, EXCLUDED_WORKFLOW_NAMES);

/**
 * Classifies a workflow as a DX or non-DX pipeline.
 *
 * A workflow is a DX pipeline when it references the DX repository (a reusable
 * workflow or action from `pagopa/dx`) or when it belongs to the DX repository
 * itself. The repository check is required because the DX repository's own
 * workflows call local reusable workflows with `$/.github/workflows/...`, which
 * carry no `pagopa/dx` reference and would otherwise be misclassified as
 * non-DX.
 */
export const dxPipelineCase = (
  pipelineColumn: string,
  repositoryColumn: string,
): SQL =>
  sql`CASE WHEN ${sql.raw(repositoryColumn)} = ${DX_REPOSITORY_FULL_NAME} OR ${sql.raw(pipelineColumn)} LIKE ${`%${DX_REPOSITORY_FULL_NAME}%`} THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END`;

/**
 * Prefixes a workflow name with `DX ` when it comes from a DX pipeline,
 * producing the display label used across workflow charts.
 */
export const dxWorkflowNameLabel = (
  nameColumn: string,
  pipelineColumn: string,
): SQL =>
  sql`CONCAT(CASE WHEN ${sql.raw(pipelineColumn)} LIKE '%pagopa/dx%' THEN 'DX ' ELSE '' END, ${sql.raw(nameColumn)})`;

/**
 * Buckets a timestamp expression by day or week depending on the window size,
 * keeping chart granularity consistent across adapters.
 */
export const timeBucket = (expression: SQL | string, days: number): SQL => {
  const bucketSource = asFragment(expression);

  return sql`CASE WHEN ${days} < ${WEEKLY_BUCKET_THRESHOLD_DAYS} THEN ${bucketSource}::date ELSE DATE_TRUNC('week', ${bucketSource})::date END`;
};

/**
 * Day or week interval matching {@link timeBucket}, for `generate_series` calls
 * that must step at the same granularity as the bucket.
 */
export const timeBucketInterval = (days: number): SQL =>
  sql`CASE WHEN ${days} < ${WEEKLY_BUCKET_THRESHOLD_DAYS} THEN '1 day'::interval ELSE '1 week'::interval END`;

/**
 * Builds a Postgres text array literal from bound parameters, safe for empty
 * lists. Used for `col = ANY(<array>)` multi-repository filters.
 */
export const textArray = (values: readonly string[]): SQL =>
  values.length === 0
    ? sql`ARRAY[]::text[]`
    : sql`ARRAY[${sql.join(
        values.map((value) => sql`${value}`),
        sql`, `,
      )}]::text[]`;

/**
 * Predicate matching rows whose repository column is one of `fullNames`.
 *
 * Uses `col = ANY(<array>)` so a multi-repository selection is a single bound
 * parameter. An empty list matches nothing, which is how the portal turns an
 * empty repository selection into an empty dashboard instead of "all".
 * Accepts a qualified column name (e.g. `r.full_name`), so the same scope can
 * be applied to any alias.
 */
export const repositoryIn = (
  column: string,
  fullNames: readonly string[],
): SQL => sql`${sql.raw(column)} = ANY(${textArray(fullNames)})`;

/**
 * Builds `col NOT IN (...)` for an exclusion list. Returns `TRUE` for an empty
 * list so the predicate never breaks. Accepts a qualified column name
 * (e.g. `ipr.title`), so the same exclusion can be applied to any alias.
 */
export const notInValues = (column: string, values: readonly string[]): SQL => {
  if (values.length === 0) {
    return sql`TRUE`;
  }

  return sql`${sql.raw(column)} NOT IN (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
};

/**
 * Builds `col NOT LIKE '%a%' AND col NOT LIKE '%b%' ...` for an exclusion list.
 * Returns `TRUE` for an empty list so the predicate never breaks.
 */
export const notLikeAll = (
  column: string,
  substrings: readonly string[],
): SQL => {
  if (substrings.length === 0) {
    return sql`TRUE`;
  }

  return sql.join(
    substrings.map((value) => sql`${sql.raw(column)} NOT LIKE ${`%${value}%`}`),
    sql` AND `,
  );
};

/**
 * Matches workflow names that look like deploy/release pipelines. This is a
 * name-based heuristic: the data model has no explicit deployment event, so it
 * is used and labelled as a proxy for deployment frequency.
 */
export const deployWorkflowMatch = (nameColumn: string): SQL =>
  sql`(LOWER(${sql.raw(nameColumn)}) LIKE '%deploy%' OR LOWER(${sql.raw(nameColumn)}) LIKE '%delivery%' OR LOWER(${sql.raw(nameColumn)}) LIKE '%release%' OR LOWER(${sql.raw(nameColumn)}) LIKE '%apply%')`;
