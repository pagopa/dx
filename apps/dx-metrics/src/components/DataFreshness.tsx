"use client";

import { useEffect, useState } from "react";

import { DATA_STALE_AFTER_DAYS } from "@/lib/config";
import { useDateFormatters } from "@/lib/locale";

interface DataFreshnessProps {
  className?: string;
  referenceDate: string;
  /**
   * Window length in days. When provided, the exact range the metrics cover is
   * shown, because every window is anchored to the latest activity in the view
   * (not to today): without this, "last 60 days" is easy to misread as the last
   * 60 wall-clock days on a repository that has been quiet for months.
   */
  windowDays?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Shows the latest data timestamp a dashboard window is anchored to, so users
 * know how fresh the numbers are when the importer lags behind.
 *
 * The relative "x days ago" is computed after mount (never during SSR) so the
 * server and client cannot render different text and trigger a hydration
 * mismatch. Past `DATA_STALE_AFTER_DAYS` the note turns amber.
 */
export function DataFreshness({
  className = "",
  referenceDate,
  windowDays,
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
  const textClassName = isStale ? "text-amber-300" : "text-gray-400";
  const windowStart =
    windowDays !== undefined && windowDays > 0 && !Number.isNaN(timestamp)
      ? new Date(timestamp - windowDays * MS_PER_DAY)
      : null;

  return (
    <div className={className}>
      <p className={`text-xs ${textClassName}`}>
        Data updated to {full(referenceDate)}
        {daysAgo !== null && daysAgo > 0
          ? ` · ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`
          : ""}
        {isStale ? " · data may be stale" : ""}
      </p>
      {windowStart && (
        <p className="text-xs text-gray-500">
          {windowDays}-day window: {short(windowStart)} – {short(referenceDate)}{" "}
          · ends at the latest activity in this view, not today
        </p>
      )}
    </div>
  );
}
