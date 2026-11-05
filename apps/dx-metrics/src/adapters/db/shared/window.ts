/**
 * Resolves the time window a dashboard actually queries.
 *
 * Two inputs are supported and must agree with the rest of the portal:
 *
 * - **Custom range** (`start` + `end`, `YYYY-MM-DD`): the explicit interval the
 *   reader picked. Both ends are clamped to the data the dashboard has, so a
 *   hand-edited URL can never request a window outside the imported range.
 * - **Trailing window** (`days`): the legacy behaviour, kept for bookmarks and
 *   for callers that never send dates. It ends at the latest data point.
 *
 * Every query filters with an explicit closed interval, `startDate` and
 * `endDate`, instead of a trailing `reference - days` length: a custom range can
 * end before the latest data point, so the upper bound has to be enforced as
 * well. `windowStart` / `windowEnd` are the calendar dates the UI displays,
 * while `days` is the inclusive length used for bucketing and period labels.
 */

import {
  addCalendarDays,
  calendarDaysBetween,
  clampCalendarDate,
  MS_PER_DAY,
  toCalendarDate,
} from "@/lib/date-range";

import type { DashboardMeta } from "./types";

/** A closed interval of timestamps, `[startDate, endDate]`. */
export interface WindowBounds {
  /** Inclusive upper bound for the SQL predicates. */
  readonly endDate: string;
  /** Inclusive lower bound for the SQL predicates. */
  readonly startDate: string;
}

/** Inputs for {@link resolveWindow}. Timestamps may be full ISO values. */
export interface ResolveWindowInput {
  /** First timestamp the dashboard has data for. */
  readonly availableFrom: string;
  /** Last timestamp the dashboard has data for. */
  readonly availableTo: string;
  /** Trailing window length used when no explicit range is provided. */
  readonly days: number;
  /** End of the custom range, inclusive. */
  readonly end?: string;
  /** Start of the custom range, inclusive. */
  readonly start?: string;
}

/** A window ready to be used by the adapters and exposed in the payload meta. */
export interface ResolvedWindow extends WindowBounds {
  readonly availableFrom: string;
  readonly availableTo: string;
  /** Inclusive length of the window, used by "previous period" comparisons. */
  readonly days: number;
  /** Latest data timestamp, kept for the freshness note. */
  readonly referenceDate: string;
  readonly windowEnd: string;
  readonly windowStart: string;
}

const startOfDay = (date: string): string => `${date}T00:00:00.000Z`;
const endOfDay = (date: string): string => `${date}T23:59:59.999Z`;

/** Shifts a timestamp by whole days, keeping the value in UTC. */
const shiftTimestamp = (timestamp: string, deltaDays: number): string =>
  new Date(Date.parse(timestamp) + deltaDays * MS_PER_DAY).toISOString();

/**
 * Resolves the window from the request and the data the adapter can see.
 *
 * A custom range always wins over `days`. The end of the last selected day is
 * used as the SQL upper bound so the whole `end` day is included; `days` is the
 * inclusive calendar span, so the derived "previous period" and "first half"
 * windows keep the same length as the visible one.
 */
export const resolveWindow = ({
  availableFrom,
  availableTo,
  days,
  end,
  start,
}: ResolveWindowInput): ResolvedWindow => {
  const firstDay = toCalendarDate(availableFrom);
  const lastDay = toCalendarDate(availableTo);

  if (start === undefined && end === undefined) {
    return {
      availableFrom: firstDay,
      availableTo: lastDay,
      days,
      // Legacy windows keep the exact latest timestamp as the upper bound, so a
      // bookmark renders exactly what it rendered before this change.
      endDate: availableTo,
      referenceDate: availableTo,
      startDate: shiftTimestamp(availableTo, -days),
      windowEnd: lastDay,
      windowStart: addCalendarDays(lastDay, -days),
    };
  }

  const windowEnd = clampCalendarDate(end ?? lastDay, firstDay, lastDay);
  const requestedStart = clampCalendarDate(
    start ?? addCalendarDays(windowEnd, -(days - 1)),
    firstDay,
    windowEnd,
  );
  const windowStart = requestedStart > windowEnd ? windowEnd : requestedStart;

  return {
    availableFrom: firstDay,
    availableTo: lastDay,
    days: calendarDaysBetween(windowStart, windowEnd),
    endDate: endOfDay(windowEnd),
    referenceDate: availableTo,
    startDate: startOfDay(windowStart),
    windowEnd,
    windowStart,
  };
};

/**
 * The equally-sized window immediately before `window`.
 *
 * Anchored to the window itself rather than to the latest data point, so a
 * historical selection compares against the months before it instead of the
 * months before today. The upper bound is exclusive by contract: callers use
 * `< previousWindow.endDate`.
 */
export const previousWindow = ({
  days,
  startDate,
}: ResolvedWindow): WindowBounds => ({
  endDate: startDate,
  startDate: shiftTimestamp(startDate, -days),
});

/**
 * Splits a window into its recent half and the preceding half.
 *
 * The cards compare the two halves of the selected window; keeping the split
 * relative to the resolved bounds means a historical range is not compared
 * against the latest data point.
 */
export const splitWindow = (
  window: ResolvedWindow,
): {
  readonly current: WindowBounds;
  readonly halfDays: number;
  readonly previous: WindowBounds;
} => {
  const halfDays = Math.max(1, Math.floor(window.days / 2));
  const halfStart = shiftTimestamp(window.endDate, -halfDays);

  return {
    current: { endDate: window.endDate, startDate: halfStart },
    halfDays,
    previous: { endDate: halfStart, startDate: window.startDate },
  };
};

/** Converts a resolved window into the payload metadata the UI reads. */
export const windowMeta = (window: ResolvedWindow): DashboardMeta => ({
  availableFrom: window.availableFrom,
  availableTo: window.availableTo,
  days: window.days,
  referenceDate: window.referenceDate,
  windowEnd: window.windowEnd,
  windowStart: window.windowStart,
});
