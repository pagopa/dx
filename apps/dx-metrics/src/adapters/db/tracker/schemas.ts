/** Zod schemas and inferred types for the Tracker database adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const trackerMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

export const categoryRowSchema = z.object({
  category: z.string().min(1),
  requests: sqlNumberSchema,
});

export const frequencyTrendRowSchema = z.object({
  actual_requests: sqlNumberSchema,
  request_date: sqlDateSchema,
  trend: sqlNumberSchema,
});

export const priorityRowSchema = z.object({
  priority: z.string().min(1),
  requests: sqlNumberSchema,
});

export const trackerCardsSchema = z.object({
  avgClose: nullableSqlNumberSchema,
  closedTotal: nullableSqlNumberSchema,
  openedTotal: nullableSqlNumberSchema,
  requestsTrend: nullableSqlNumberSchema,
});

export const trackerDashboardSchema = z.object({
  byCategory: z.array(categoryRowSchema),
  byPriority: z.array(priorityRowSchema),
  cards: trackerCardsSchema,
  frequencyTrend: z.array(frequencyTrendRowSchema),
});

export type CategoryRow = z.infer<typeof categoryRowSchema>;
export type FrequencyTrendRow = z.infer<typeof frequencyTrendRowSchema>;
export type PriorityRow = z.infer<typeof priorityRowSchema>;
export type TrackerCards = z.infer<typeof trackerCardsSchema>;
export type TrackerDashboard = z.infer<typeof trackerDashboardSchema>;
