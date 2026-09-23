/**
 * Shared resolver for the latest available data timestamp.
 *
 * Every dashboard anchors its time window to the newest row it can see rather
 * than to `NOW()`. When the importer lags behind, `NOW()` silently shifts the
 * window into empty time; anchoring to the data keeps dashboards comparable.
 */

import { sql, type SQL } from "drizzle-orm";

import { parseSqlRow } from "./sql-parsing";
import { referenceDateRowSchema } from "./schemas";

/** Inputs for {@link buildReferenceDateQuery}. */
export interface ReferenceDateQuery {
  /** Timestamp column / expression to take the maximum of. */
  readonly column: SQL | string;
  /** `FROM` clause, including joins. */
  readonly from: SQL | string;
  /** Optional `WHERE` predicate (repository scope, filters, ...). */
  readonly where?: SQL;
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
