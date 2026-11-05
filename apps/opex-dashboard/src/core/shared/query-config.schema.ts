/**
 * Shared query configuration schema.
 * Used across config input validation and template context.
 */

import { z } from "zod";

/**
 * Default HTTP status code categories used for response codes queries.
 */
export const DEFAULT_STATUS_CODE_CATEGORIES = [
  "1XX",
  "2XX",
  "3XX",
  "4XX",
  "5XX",
] as const;

/**
 * Query configuration for dashboard metrics.
 * Defines which percentiles and status codes to include in queries.
 */
export const QueryConfigSchema = z.object({
  response_time_percentile: z
    .number()
    .default(95)
    .describe("Percentile for response time queries. Default: 95"),
  status_code_categories: z
    .array(
      z
        .string()
        .regex(
          /^[1-5]XX$/,
          "Must be a status code class like 1XX, 2XX, ..., 5XX",
        ),
    )
    .default([...DEFAULT_STATUS_CODE_CATEGORIES])
    .describe(
      "HTTP status code categories for response codes queries. Default: 1XX..5XX",
    ),
});

export type QueryConfig = z.infer<typeof QueryConfigSchema>;
