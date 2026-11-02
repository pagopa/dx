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
 * Every adapter still builds its SQL as `>= reference - days` and `<= reference`,
 * so a resolved window exposes `days` and `endDate` instead of forcing each
 * query to take two explicit bounds.
 */

import {
  addCalendarDays,
  calendarDaysBetween,
  clampCalendarDate,
  toCalendarDate,
} from "@/lib/date-range";

import type { DashboardMeta } from "./types";

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
export interface ResolvedWindow {
  readonly availableFrom: string;
  readonly availableTo: string;
  /** Inclusive length of the window, used by "previous period" comparisons. */
  readonly days: number;
  /** Upper bound for the SQL predicates (inclusive end of the last day). */
  readonly endDate: string;
  /** Latest data timestamp, kept for the freshness note. */
  readonly referenceDate: string;
  readonly windowEnd: string;
  readonly windowStart: string;
}

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
    endDate: `${windowEnd} 23:59:59.999`,
    referenceDate: availableTo,
    windowEnd,
    windowStart,
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
