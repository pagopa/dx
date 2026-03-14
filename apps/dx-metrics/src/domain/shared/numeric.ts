/** Utilities for converting PostgreSQL numeric strings to JS numbers. */

/**
 * Converts specified keys from PostgreSQL numeric/bigint strings to JS numbers.
 * Use when the result set has a known set of numeric columns.
 */
export const numericRows = <T extends Record<string, unknown>>(
  rows: readonly T[],
  keys: readonly string[],
): T[] =>
  rows.map((row) => {
    const out = { ...row };
    for (const k of keys) {
      if (out[k] != null) (out as Record<string, unknown>)[k] = Number(out[k]);
    }
    return out;
  });

/**
 * Coerces every string value that looks like a number into a JS number,
 * except date-like strings (YYYY-MM-DD). Use when the column set is dynamic.
 */
export const coerceNumbers = <T extends Record<string, unknown>>(
  rows: readonly T[],
): T[] =>
  rows.map((row) => {
    const out = { ...row };
    for (const key of Object.keys(out)) {
      const v = out[key];
      if (typeof v === "string" && v !== "" && !isNaN(Number(v))) {
        if (!/\d{4}-\d{2}-\d{2}/.test(v)) {
          (out as Record<string, unknown>)[key] = Number(v);
        }
      }
    }
    return out;
  });
