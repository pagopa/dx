/**
 * Configuration schema using Zod.
 * Defines and validates the structure of YAML configuration files.
 */

import { z } from "zod";

import { EndpointOverridePropertiesSchema } from "../shared/endpoint-properties.schema.js";
import {
  QueryConfig,
  QueryConfigSchema,
} from "../shared/query-config.schema.js";
import { DEFAULTS } from "./defaults.js";

// Schema for endpoint overrides - reuses shared schema with camelCase properties
const EndpointOverrideSchema = EndpointOverridePropertiesSchema;

// Schema for overrides section
const OverridesSchema = z.object({
  endpoints: z
    .record(z.string(), EndpointOverrideSchema)
    .optional()
    .describe(
      "Override alarm thresholds and settings for specific endpoints (key: endpoint path)",
    ),
  hosts: z
    .array(z.string())
    .optional()
    .describe(
      "Override host URLs from OpenAPI spec (e.g., https://example.com)",
    ),
  queries: QueryConfigSchema.optional().describe(
    "Optional query configuration overrides",
  ),
});

// Schema for Terraform backend configuration
const BackendConfigSchema = z.object({
  containerName: z.string().describe("Blob container name for Terraform state"),
  key: z.string().describe("State file key/path"),
  resourceGroupName: z
    .string()
    .describe("Azure resource group for backend state"),
  storageAccountName: z
    .string()
    .describe("Storage account for Terraform state"),
});

// Schema for environment-specific configuration
const EnvironmentConfigSchema = z.object({
  backend: BackendConfigSchema.optional().describe(
    "Azure backend configuration for Terraform state",
  ),
  envShort: z
    .string()
    .max(1)
    .describe("Environment short name (1 char: 'd'=dev, 'u'=uat, 'p'=prod)"),
  prefix: z
    .string()
    .max(6)
    .describe("Project prefix (max 6 chars, e.g., 'io', 'pagopa')"),
});

// Schema for Terraform configuration
const TerraformConfigSchema = z.object({
  environments: z
    .object({
      dev: EnvironmentConfigSchema.optional(),
      prod: EnvironmentConfigSchema.optional(),
      uat: EnvironmentConfigSchema.optional(),
    })
    .optional()
    .describe("Environment-specific configurations for dev/uat/prod"),
});

/**
 * Transform snake_case keys to camelCase recursively.
 * Special handling for overrides.endpoints to preserve endpoint path keys.
 */
function snakeToCamel(obj: unknown): unknown {
  function transform(
    value: unknown,
    path: string[] = [],
    isEndpointsMap = false,
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => transform(item, path, false));
    }

    if (typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        // Don't transform endpoint path keys (they are inside overrides.endpoints)
        // but do transform their values
        const shouldPreserveKey = isEndpointsMap;

        const camelKey = shouldPreserveKey
          ? key
          : key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        // Check if we're entering the endpoints map
        const newPath = [...path, camelKey];
        const isNextEndpointsMap =
          newPath.length === 2 &&
          newPath[0] === "overrides" &&
          newPath[1] === "endpoints";

        result[camelKey] = transform(val, newPath, isNextEndpointsMap);
      }
      return result;
    }

    return value;
  }

  return transform(obj);
}

// Main configuration schema with preprocessing for snake_case to camelCase conversion
export const ConfigSchema = z.preprocess(
  snakeToCamel,
  z.object({
    actionGroups: z
      .array(z.string())
      .describe(
        "Array of Azure Action Group resource IDs for alarm notifications",
      ),
    availabilityThreshold: z
      .number()
      .optional()
      .default(DEFAULTS.availability_threshold)
      .describe(
        "Default minimum availability percentage (0-1). Default: 0.99 (99%)",
      ),
    dataSource: z
      .string()
      .describe(
        "Azure resource ID for metrics data source (Application Gateway or API Management)",
      ),
    evaluationFrequency: z
      .number()
      .optional()
      .default(DEFAULTS.evaluation_frequency)
      .describe("Default frequency in minutes to evaluate alarms. Default: 10"),
    evaluationTimeWindow: z
      .number()
      .optional()
      .default(DEFAULTS.evaluation_time_window)
      .describe(
        "Default time window in minutes for alarm evaluation. Default: 20",
      ),
    eventOccurrences: z
      .number()
      .optional()
      .default(DEFAULTS.event_occurrences)
      .describe(
        "Default number of event occurrences to trigger an alarm. Default: 1",
      ),
    location: z
      .string()
      .describe("Azure region/location for the dashboard (e.g., West Europe)"),
    name: z.string().describe("Name of the dashboard"),
    oa3Spec: z
      .string()
      .describe(
        "Path or HTTP URL to OpenAPI 3.x specification file (supports OA2 and OA3)",
      ),
    overrides: OverridesSchema.optional().describe(
      "Optional overrides for hosts, per-endpoint alarm thresholds, and query configurations",
    ),
    queries: QueryConfigSchema.optional().describe(
      "Optional global query configuration overrides",
    ),
    resourceType: z
      .enum(["app-gateway", "api-management"])
      .optional()
      .default("app-gateway")
      .describe(
        "Type of Azure resource to monitor: app-gateway (Application Gateway) or api-management (API Management). Default: app-gateway",
      ),
    responseTimeThreshold: z
      .number()
      .optional()
      .default(DEFAULTS.response_time_threshold)
      .describe("Default maximum response time in seconds. Default: 1.0"),
    terraform: TerraformConfigSchema.optional().describe(
      "Optional Terraform and environment-specific configuration",
    ),
    timespan: z
      .string()
      .optional()
      .default(DEFAULTS.timespan)
      .describe(
        "Time range for dashboard queries (e.g., 5m, 1h, 24h). Default: 5m",
      ),
  }),
);

export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type EndpointOverride = z.infer<typeof EndpointOverrideSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type Overrides = z.infer<typeof OverridesSchema>;
export type TerraformConfig = z.infer<typeof TerraformConfigSchema>;
export type { QueryConfig };
