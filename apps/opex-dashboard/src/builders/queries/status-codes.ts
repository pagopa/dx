/**
 * Helpers for building the HTTP status code classification Kusto expression.
 */

import {
  DEFAULT_STATUS_CODE_CATEGORIES,
  type QueryConfig,
} from "../../core/shared/query-config.schema.js";

type StatusCodeCategory = `1XX` | `2XX` | `3XX` | `4XX` | `5XX`;

/**
 * Build the Kusto `case(...)` expression that maps an HTTP status code field
 * to the configured status code categories.
 *
 * When the configured categories cover every class (1XX..5XX) the last class is
 * used as the fallback, preserving the historical behaviour. Otherwise any
 * uncategorised value falls into an explicit `"Other"` bucket so that rows are
 * never silently mislabelled.
 *
 * @param field - Name of the Kusto column holding the numeric status code
 * @param categories - Configured status code categories
 * @returns A Kusto `case(...)` expression
 */
export function statusCodeCaseExpression(
  field: string,
  categories?: QueryConfig["status_code_categories"],
): string {
  const selected =
    categories && categories.length > 0
      ? categories
      : [...DEFAULT_STATUS_CODE_CATEGORIES];

  const isExhaustive = DEFAULT_STATUS_CODE_CATEGORIES.every((category) =>
    selected.includes(category),
  );

  const conditions = isExhaustive
    ? selected.filter((category) => category !== "5XX")
    : selected;

  const fallback = isExhaustive ? "5XX" : "Other";

  const arms = conditions.map((category) => {
    const digit = (category as StatusCodeCategory).charAt(0);
    return `  ${field} between (${digit}00 .. ${digit}99), "${category}"`;
  });

  arms.push(`  "${fallback}"`);

  return `case(\n${arms.join(",\n")})`;
}
