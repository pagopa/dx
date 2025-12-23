/**
 * Shared query configuration schema.
 * Used across config input validation and template context.
 */

import { z } from "zod";

/**
 * Raw query configuration with snake_case naming (matching YAML input).
 * Defines which percentiles and status codes to include in queries.
 */
export const QueryConfigSchemaRaw = z.object({
  response_time_percentile: z
    .number()
    .default(95)
    .describe("Percentile for response time queries. Default: 95"),
  status_code_categories: z
    .array(z.string())
    .default(["1XX", "2XX", "3XX", "4XX", "5XX"])
    .describe("HTTP status code categories for response codes queries"),
});

/**
 * Query configuration for dashboard metrics (camelCase, internal use).
 * Defines which percentiles and status codes to include in queries.
 */
export const QueryConfigSchema = z.object({
  responseTimePercentile: z.number().default(95),
  statusCodeCategories: z
    .array(z.string())
    .default(["1XX", "2XX", "3XX", "4XX", "5XX"]),
});

export type QueryConfig = z.infer<typeof QueryConfigSchema>;

export type QueryConfigRaw = z.infer<typeof QueryConfigSchemaRaw>;
/**
 * Transform query config from snake_case to camelCase.
 */
export function transformQueryConfig(raw: QueryConfigRaw): QueryConfig {
  return {
    responseTimePercentile: raw.response_time_percentile,
    statusCodeCategories: raw.status_code_categories,
  };
}
