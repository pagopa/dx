/** Shared number and date formatting for dashboard UI. */

/** Placeholder shown when a value is not available. */
export const EMPTY_VALUE = "—";

/** Formats a number with a fixed number of decimals, or the empty placeholder. */
export const formatNumber = (
  value: null | number | undefined,
  digits = 0,
): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? EMPTY_VALUE
    : value.toFixed(digits);

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

/** Formats a date as `10 Nov`, or returns the raw string when invalid. */
export const formatShortDate = (value: string | number | Date): string => {
  const date = toDate(value);

  if (date === null) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Formats a date as `10 Nov 2026`, or returns the raw string when invalid. */
export const formatFullDate = (value: string | number | Date): string => {
  const date = toDate(value);

  if (date === null) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
