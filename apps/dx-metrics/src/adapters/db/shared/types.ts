/** Shared types for database-backed dashboard adapters. */

import type { Database } from "@pagopa/dx-metrics-core/database";

export type { Database };

/** Freshness metadata attached to every dashboard payload. */
export interface DashboardMeta {
  /** Window length in days, when the dashboard is time-windowed. */
  readonly days?: number;
  /** Latest data timestamp the window is anchored to. */
  readonly referenceDate: string;
}

/** A dashboard payload that exposes its data-freshness metadata. */
export interface WithMeta {
  readonly meta: DashboardMeta;
}
