/**
 * Calendar-date helpers shared by the dashboard filters (client) and the
 * database adapters (server).
 *
 * Dates travel as `YYYY-MM-DD` strings: they are what an `<input type="date">`
 * produces and what a Postgres `::date` returns, so they need no timezone
 * negotiation. Arithmetic is done in UTC on purpose — shifting a calendar date
 * by a day must never become 23 or 25 hours because of a DST transition.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Takes the calendar date out of a date or timestamp string. */
export const toCalendarDate = (value: string): string => value.slice(0, 10);

/** Parses a `YYYY-MM-DD` (or a timestamp) to UTC midnight, or `null`. */
export const parseCalendarDate = (value: string): null | number => {
  const day = toCalendarDate(value);

  if (!ISO_DATE_PATTERN.test(day)) {
    return null;
  }

  const ms = Date.parse(`${day}T00:00:00.000Z`);

  if (Number.isNaN(ms)) {
    return null;
  }

  // `Date.parse` normalizes impossible dates (2026-02-30 becomes March 2), so
  // round-trip the value to reject them instead of silently shifting a range.
  return new Date(ms).toISOString().slice(0, 10) === day ? ms : null;
};

/** Formats UTC milliseconds as a `YYYY-MM-DD` calendar date. */
export const formatCalendarDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/** True when the value is a valid `YYYY-MM-DD` date. */
export const isCalendarDate = (value: string): boolean =>
  parseCalendarDate(value) !== null;

/** Shifts a calendar date by whole days. Returns the input when invalid. */
export const addCalendarDays = (date: string, delta: number): string => {
  const ms = parseCalendarDate(date);

  return ms === null ? date : formatCalendarDate(ms + delta * MS_PER_DAY);
};

/**
 * Inclusive number of calendar days from `start` to `end`.
 *
 * A range that starts and ends on the same day counts as one day, matching how
 * the SQL window is built: the whole end day is included.
 */
export const calendarDaysBetween = (start: string, end: string): number => {
  const startMs = parseCalendarDate(start);
  const endMs = parseCalendarDate(end);

  if (startMs === null || endMs === null) {
    return 1;
  }

  return Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY) + 1);
};

/**
 * Clamps a calendar date into `[min, max]`. ISO dates compare correctly as
 * strings, so no parsing is needed on the happy path.
 */
export const clampCalendarDate = (
  value: string,
  min: string,
  max: string,
): string => {
  if (value < min) {
    return min;
  }

  return value > max ? max : value;
};
