"use client";

import { useEffect, useState } from "react";

import { DATA_STALE_AFTER_DAYS } from "@/lib/config";
import { useDateFormatters } from "@/lib/locale";

interface DataFreshnessProps {
  className?: string;
  referenceDate: string;
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
}: DataFreshnessProps) {
  const { full } = useDateFormatters();
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

  return (
    <p
      className={`text-xs ${isStale ? "text-amber-300" : "text-gray-400"} ${className}`}
    >
      Data updated to {full(referenceDate)}
      {daysAgo !== null && daysAgo > 0
        ? ` · ${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`
        : ""}
      {isStale ? " · data may be stale" : ""}
    </p>
  );
}
