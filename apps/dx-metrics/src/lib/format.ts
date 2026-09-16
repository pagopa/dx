/** Shared number and date formatting for dashboard UI. */

/** Placeholder shown when a value is not available. */
export const EMPTY_VALUE = "—";

/**
 * Locale used for dates before the browser preference is known, and whenever the
 * browser locale cannot be resolved. Chosen over the default runtime locale so
 * the server and the first client render agree (no hydration mismatch).
 */
export const DEFAULT_LOCALE = "en-GB";

/** Formats a number with a fixed number of decimals, or the empty placeholder. */
export const formatNumber = (
  value: null | number | undefined,
  digits = 0,
): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? EMPTY_VALUE
    : value.toFixed(digits);

const integerFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

/**
 * Formats an integer with thousands separators (`1234` -> `1,234`), or the
 * empty placeholder. Use it for counts (sample sizes, totals) where a long digit
 * string would otherwise be hard to read at a glance.
 */
export const formatInteger = (value: null | number | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? EMPTY_VALUE
    : integerFormatter.format(value);

/** Formats an already-scaled percentage value (e.g. `12.5` -> `12.5%`). */
export const formatPercent = (
  value: null | number | undefined,
  digits = 0,
): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? EMPTY_VALUE
    : `${value.toFixed(digits)}%`;

/** Formats a value with a unit suffix, collapsing the two into one string. */
export const formatWithUnit = (
  value: null | number | undefined,
  unit?: string,
  digits = 0,
): string => {
  const formatted = formatNumber(value, digits);
  return formatted === EMPTY_VALUE || !unit
    ? formatted
    : `${formatted} ${unit}`;
};

const toDate = (value: string | number | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a date as `10 Nov`, or returns the raw string when invalid.
 * `locale` defaults to `DEFAULT_LOCALE` so pure callers stay deterministic;
 * React components pass the browser-derived locale via `useDateFormatters`.
 */
export const formatShortDate = (
  value: string | number | Date,
  locale: string = DEFAULT_LOCALE,
): string => {
  const date = toDate(value);

  if (date === null) {
    return String(value);
  }

  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
};

/** Formats a date as `10 Nov 2026`, or returns the raw string when invalid. */
export const formatFullDate = (
  value: string | number | Date,
  locale: string = DEFAULT_LOCALE,
): string => {
  const date = toDate(value);

  if (date === null) {
    return String(value);
  }

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
