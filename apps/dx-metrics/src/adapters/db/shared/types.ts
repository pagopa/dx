/** Shared types for database-backed dashboard adapters. */

import type { Database } from "@pagopa/dx-metrics-core/database";

export type { Database };

/** Freshness metadata attached to every dashboard payload. */
export interface DashboardMeta {
  /** First calendar date the dashboard has data for (custom-range minimum). */
  readonly availableFrom?: string;
  /** Last calendar date the dashboard has data for (custom-range maximum). */
  readonly availableTo?: string;
  /** Window length in days, when the dashboard is time-windowed. */
  readonly days?: number;
  /** Latest data timestamp the window is anchored to. */
  readonly referenceDate: string;
  /** End of the window actually applied, as a `YYYY-MM-DD` calendar date. */
  readonly windowEnd?: string;
  /** Start of the window actually applied, as a `YYYY-MM-DD` calendar date. */
  readonly windowStart?: string;
}

/** A dashboard payload that exposes its data-freshness metadata. */
export interface WithMeta {
  readonly meta: DashboardMeta;
}
