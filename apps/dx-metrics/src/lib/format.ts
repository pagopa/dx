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

const decimalFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 2,
});

/**
 * Formats a number with up to two decimals and thousands separators, without
 * forcing trailing zeros (`3.5` -> `3.5`, `1234.5` -> `1,234.5`). Use it for
 * means and other fractional values where `formatInteger` would round away
 * meaningful precision.
 */
export const formatDecimal = (value: null | number | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? EMPTY_VALUE
    : decimalFormatter.format(value);

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

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDate = (value: string | number | Date): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // SQL `DATE` values (and the `::date` buckets derived from them) arrive as
  // calendar strings. `new Date("2026-11-10")` would read them as UTC midnight
  // and, west of UTC, format them as the previous day, so parse the components
  // into a local calendar date instead.
  if (typeof value === "string") {
    const match = DATE_ONLY_PATTERN.exec(value);

    if (match) {
      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
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
