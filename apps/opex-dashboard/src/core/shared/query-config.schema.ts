/**
 * Shared query configuration schema.
 * Used across config input validation and template context.
 */

import { z } from "zod";

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
    .array(z.string())
    .default(["1XX", "2XX", "3XX", "4XX", "5XX"])
    .describe("HTTP status code categories for response codes queries"),
});

export type QueryConfig = z.infer<typeof QueryConfigSchema>;
