"use client";

import { useEffect, useState } from "react";

import { DATA_STALE_AFTER_DAYS } from "@/lib/config";
import { useDateFormatters } from "@/lib/locale";

interface DataFreshnessProps {
  /** First calendar date the dashboard has data for, when it is time-windowed. */
  availableFrom?: string;
  /** Last calendar date the dashboard has data for, when it is time-windowed. */
  availableTo?: string;
  className?: string;
  referenceDate: string;
  /** End of the window actually applied (`YYYY-MM-DD`). */
  windowEnd?: string;
  /** Start of the window actually applied (`YYYY-MM-DD`). */
  windowStart?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Shows the latest data timestamp and the exact window a dashboard covers.
 *
 * The window is no longer implied by a day count: the reader can pick both ends
 * of it, so the caption states the applied range and the range of data the
 * portal has, which is also what bounds the date inputs.
 *
 * The relative "x days ago" is computed after mount (never during SSR) so the
 * server and client cannot render different text and trigger a hydration
 * mismatch. Past `DATA_STALE_AFTER_DAYS` the note turns amber.
 */
export function DataFreshness({
  availableFrom,
  availableTo,
  className = "",
  referenceDate,
  windowEnd,
  windowStart,
}: DataFreshnessProps) {
  const { full, short } = useDateFormatters();
  const timestamp = Date.parse(referenceDate);
  const [daysAgo, setDaysAgo] = useState<null | number>(null);

  useEffect(() => {
    if (Number.isNaN(timestamp)) {
      return;
    }

    // The relative age is intentionally computed after mount: the server and
    // client clocks can differ, and rendering it during SSR risks a hydration
    // mismatch. This mirrors the pattern used by the dashboard data hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDaysAgo(Math.floor((Date.now() - timestamp) / MS_PER_DAY));
  }, [timestamp]);

  const isStale = daysAgo !== null && daysAgo > DATA_STALE_AFTER_DAYS;
  const textClassName = isStale
    ? "text-amber-700 dark:text-amber-300"
    : "text-muted-foreground";
  const hasWindow = windowStart !== undefined && windowEnd !== undefined;
  const hasAvailableRange =
    availableFrom !== undefined && availableTo !== undefined;

  return (
    <div className={className}>
      <p className={`text-xs ${textClassName}`}>
        Data updated to {full(referenceDate)}
        {daysAgo !== null && daysAgo > 0
          ? ` · ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`
          : ""}
        {isStale ? " · data may be stale" : ""}
      </p>
      {hasWindow && (
        <p className="text-xs text-subtle-foreground">
          Range: {short(windowStart)} – {short(windowEnd)}
          {hasAvailableRange
            ? ` · available data ${short(availableFrom)} – ${short(availableTo)}`
            : ""}
        </p>
      )}
    </div>
  );
}
