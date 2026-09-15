"use client";

import { formatFullDate } from "@/lib/format";

interface DataFreshnessProps {
  className?: string;
  referenceDate: string;
}

/**
 * Shows the latest data timestamp a dashboard window is anchored to, so users
 * know how fresh the numbers are when the importer lags behind.
 */
export function DataFreshness({
  className = "",
  referenceDate,
}: DataFreshnessProps) {
  return (
    <p className={`text-xs text-gray-400 ${className}`}>
      Data updated to {formatFullDate(referenceDate)}
    </p>
  );
}
