/** Zod schemas and inferred types for the cross-repository benchmark adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

/** Per-repository pull-request benchmark values. */
export const prBenchmarkRowSchema = z.object({
  avgPrSize: nullableSqlNumberSchema,
  count: sqlNumberSchema,
  firstReviewCount: sqlNumberSchema,
  leadTime: nullableSqlNumberSchema,
  mergedWithoutComments: nullableSqlNumberSchema,
  mergedWithoutReview: nullableSqlNumberSchema,
  prSizeCount: sqlNumberSchema,
  repository: z.string().min(1),
  timeToFirstReview: nullableSqlNumberSchema,
});

/** Per-repository workflow benchmark values. */
export const workflowBenchmarkRowSchema = z.object({
  ciFailureTime: nullableSqlNumberSchema,
  durationCount: sqlNumberSchema,
  pipelineDuration: nullableSqlNumberSchema,
  repository: z.string().min(1),
  successRate: nullableSqlNumberSchema,
  successRateCount: sqlNumberSchema,
});

export interface BenchmarkInput {
  readonly configuredRepositories: readonly string[];
  readonly days: number;
}

export type PrBenchmarkRow = z.infer<typeof prBenchmarkRowSchema>;
export type WorkflowBenchmarkRow = z.infer<typeof workflowBenchmarkRowSchema>;
