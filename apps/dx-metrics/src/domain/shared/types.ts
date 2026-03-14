/** Shared domain types used across all dashboard modules. */

import type { createDatabase } from "../../db/index";

/** Common parameters for dashboard queries that support repo + time-window filtering. */
export interface DashboardParams {
  readonly days: number;
  readonly fullName: string;
}

/** Drizzle database instance — injected into every domain function. */
export type Database = ReturnType<typeof createDatabase>;
