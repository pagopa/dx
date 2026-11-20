/** Shared input schemas for database dashboard adapters. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "./sql-parsing";

export const dashboardParamsSchema = z.object({
  days: z.number().int().nonnegative(),
  /**
   * End of the custom range (`YYYY-MM-DD`), inclusive. When both `start` and
   * `end` are present they replace the trailing `days` window.
   */
  end: z.string().optional(),
  /**
   * Organisation-qualified repository names (`owner/repo`) the dashboard is
   * scoped to. An empty list is valid and matches nothing, so an empty
   * repository selection yields an empty dashboard.
   */
  fullNames: z.array(z.string().min(1)),
  /** Start of the custom range (`YYYY-MM-DD`), inclusive. */
  start: z.string().optional(),
});

export type DashboardParams = z.infer<typeof dashboardParamsSchema>;

/** Row returned by the shared reference-date query. */
export const referenceDateRowSchema = z.object({
  referenceDate: sqlTimestampSchema,
});

/** Row returned by the shared data-range query. */
export const dataRangeRowSchema = z.object({
  availableFrom: sqlTimestampSchema,
  availableTo: sqlTimestampSchema,
});

/**
 * Distribution percentiles (median, p85, p95) for a duration metric, plus the
 * number of observations they are computed on so the UI can show a sample size.
 */
export const percentileRowSchema = z.object({
  count: sqlNumberSchema,
  p50: nullableSqlNumberSchema,
  p85: nullableSqlNumberSchema,
  p95: nullableSqlNumberSchema,
});

/** Value of a metric over the previous, equally-sized time window. */
export const previousValueRowSchema = z.object({
  previous: nullableSqlNumberSchema,
});
