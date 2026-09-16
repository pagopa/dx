/** Shared input schemas for database dashboard adapters. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "./sql-parsing";

export const dashboardParamsSchema = z.object({
  days: z.number().int().nonnegative(),
  fullName: z.string().min(1),
});

export type DashboardParams = z.infer<typeof dashboardParamsSchema>;

/** Row returned by the shared reference-date query. */
export const referenceDateRowSchema = z.object({
  referenceDate: sqlTimestampSchema,
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
