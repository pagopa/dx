/**
 * Shared resolver for the latest available data timestamp.
 *
 * Every dashboard anchors its time window to the newest row it can see rather
 * than to `NOW()`. When the importer lags behind, `NOW()` silently shifts the
 * window into empty time; anchoring to the data keeps dashboards comparable.
 */

import { sql, type SQL } from "drizzle-orm";

import { dataRangeRowSchema, referenceDateRowSchema } from "./schemas";
import { parseSqlRow } from "./sql-parsing";

/** Inputs for {@link buildReferenceDateQuery}. */
export interface ReferenceDateQuery {
  /** Timestamp column / expression to take the maximum of. */
  readonly column: SQL | string;
  /** `FROM` clause, including joins. */
  readonly from: SQL | string;
  /** Optional `WHERE` predicate (repository scope, filters, ...). */
  readonly where?: SQL;
}

/** Inputs for {@link buildDataRangeQuery}. */
export interface DataRangeQuery extends ReferenceDateQuery {
  /**
   * Expression for the earliest available date, when it differs from
   * {@link column}.
   *
   * The maximum usually reads a combined "latest activity" expression
   * (`GREATEST(created_at, merged_at, updated_at)`); taking its `MIN` would
   * return the earliest *last* activity and hide older creation history. Pass
   * the creation timestamp here so the selectable range starts at the first
   * event instead of at the first row that has finished moving.
   */
  readonly minColumn?: SQL | string;
}

const asFragment = (expression: SQL | string): SQL =>
  typeof expression === "string" ? sql.raw(expression) : expression;

/**
 * Builds a single-row query returning `referenceDate`, defaulting to `NOW()`
 * when the scoped table is empty.
 */
export const buildReferenceDateQuery = ({
  column,
  from,
  where,
}: ReferenceDateQuery): SQL =>
  sql`SELECT COALESCE(MAX(${asFragment(column)}), NOW()) AS "referenceDate" FROM ${asFragment(from)}${where ? sql` WHERE ${where}` : sql``}`;

/** Parses the row produced by {@link buildReferenceDateQuery}. */
export const parseReferenceDate = (row: unknown, context: string): string =>
  parseSqlRow(referenceDateRowSchema, row, context).referenceDate;

/**
 * Builds a single-row query returning the first and last timestamp a dashboard
 * has data for, so the custom date range can be bounded by what actually exists.
 * Both ends fall back to `NOW()` when the scoped table is empty.
 */
export const buildDataRangeQuery = ({
  column,
  from,
  minColumn,
  where,
}: DataRangeQuery): SQL =>
  sql`SELECT COALESCE(MIN(${asFragment(minColumn ?? column)}), NOW()) AS "availableFrom", COALESCE(MAX(${asFragment(column)}), NOW()) AS "availableTo" FROM ${asFragment(from)}${where ? sql` WHERE ${where}` : sql``}`;

/** Parses the row produced by {@link buildDataRangeQuery}. */
export const parseDataRange = (
  row: unknown,
  context: string,
): { availableFrom: string; availableTo: string } =>
  parseSqlRow(dataRangeRowSchema, row, context);
