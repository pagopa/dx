/**
 * Helpers for naming the response time percentile column in Kusto queries.
 */

/**
 * Characters that are not allowed in a Kusto identifier and must be replaced
 * when a percentile value is embedded in a column name.
 */
const INVALID_IDENTIFIER_CHARS = /[^A-Za-z0-9_]/g;

/**
 * Build an identifier-safe Kusto column name for a response time percentile.
 *
 * Kusto treats `.` (and other punctuation) as special identifier characters
 * that require bracketed references, but the generated queries use the alias as
 * a plain identifier. A fractional percentile such as `99.9` would therefore
 * produce `duration_percentile_99.9` and break both the query and the chart.
 * The numeric percentile passed to `percentiles()` is left untouched; only the
 * alias is sanitized.
 *
 * @param percentile - Configured response time percentile
 * @returns A safe column name (e.g. `99.9` -> `duration_percentile_99_9`)
 *
 * @example
 * ```ts
 * responseTimeFieldName(95) // "duration_percentile_95"
 * responseTimeFieldName(99.9) // "duration_percentile_99_9"
 * ```
 */
export function responseTimeFieldName(percentile: number): string {
  return `duration_percentile_${String(percentile).replace(
    INVALID_IDENTIFIER_CHARS,
    "_",
  )}`;
}
