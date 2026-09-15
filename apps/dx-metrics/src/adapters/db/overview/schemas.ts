/** Zod schemas and inferred types for the cross-repository overview adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

/** Per-repository pull-request benchmark values. */
export const prBenchmarkRowSchema = z.object({
  count: sqlNumberSchema,
  leadTime: nullableSqlNumberSchema,
  mergedWithoutComments: nullableSqlNumberSchema,
  mergedWithoutReview: nullableSqlNumberSchema,
  repository: z.string().min(1),
});

/** Per-repository workflow benchmark values. */
export const workflowBenchmarkRowSchema = z.object({
  count: sqlNumberSchema,
  pipelineDuration: nullableSqlNumberSchema,
  repository: z.string().min(1),
  successRate: nullableSqlNumberSchema,
});

export interface OverviewInput {
  readonly configuredRepositories: readonly string[];
  readonly days: number;
}

export type PrBenchmarkRow = z.infer<typeof prBenchmarkRowSchema>;
export type WorkflowBenchmarkRow = z.infer<typeof workflowBenchmarkRowSchema>;
