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

// Schema for endpoint overrides
const EndpointOverrideSchema = EndpointOverridePropertiesSchema.extend({
  availability_evaluation_frequency: z
    .number()
    .optional()
    .describe(
      "Frequency in minutes to evaluate availability alarm. Default: 10",
    ),
  availability_evaluation_time_window: z
    .number()
    .optional()
    .describe(
      "Time window in minutes for availability alarm evaluation. Default: 20",
    ),
  availability_event_occurrences: z
    .number()
    .optional()
    .describe(
      "Number of event occurrences to trigger availability alarm. Default: 1",
    ),
  availability_threshold: z
    .number()
    .optional()
    .describe("Minimum availability percentage (0-1). Default: 0.99 (99%)"),
  response_time_evaluation_frequency: z
    .number()
    .optional()
    .describe(
      "Frequency in minutes to evaluate response time alarm. Default: 10",
    ),
  response_time_evaluation_time_window: z
    .number()
    .optional()
    .describe(
      "Time window in minutes for response time alarm evaluation. Default: 20",
    ),
  response_time_event_occurrences: z
    .number()
    .optional()
    .describe(
      "Number of event occurrences to trigger response time alarm. Default: 1",
    ),
  response_time_threshold: z
    .number()
    .optional()
    .describe("Maximum response time in seconds. Default: 1"),
});

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
  container_name: z
    .string()
    .describe("Blob container name for Terraform state"),
  key: z.string().describe("State file key/path"),
  resource_group_name: z
    .string()
    .describe("Azure resource group for backend state"),
  storage_account_name: z
    .string()
    .describe("Storage account for Terraform state"),
});

// Schema for environment-specific configuration
const EnvironmentConfigSchema = z.object({
  backend: BackendConfigSchema.optional().describe(
    "Azure backend configuration for Terraform state",
  ),
  env_short: z
    .string()
    .max(1)
    .describe("Environment short name (1 char: 'd'=dev, 'u'=uat, 'p'=prod)"),
  prefix: z
    .string()
    .max(6)
    .describe("Project prefix (max 6 chars, e.g., 'io', 'pagopa')"),
});

// Schema for multi-environment Terraform configuration
const TerraformEnvironmentsConfigSchema = z
  .object({
    environments: z
      .object({
        dev: EnvironmentConfigSchema.optional(),
        prod: EnvironmentConfigSchema.optional(),
        uat: EnvironmentConfigSchema.optional(),
      })
      .describe("Environment-specific configurations for dev/uat/prod"),
  })
  .strict();

// Schema for Terraform configuration (union of flat and environments modes)
const TerraformConfigSchema = z.union([
  EnvironmentConfigSchema.strict(),
  TerraformEnvironmentsConfigSchema,
]);

// Main configuration schema
export const ConfigSchema = z.object({
  action_groups: z
    .array(z.string())
    .describe(
      "Array of Azure Action Group resource IDs for alarm notifications",
    ),
  availability_threshold: z
    .number()
    .optional()
    .default(DEFAULTS.availability_threshold)
    .describe(
      "Default minimum availability percentage (0-1). Default: 0.99 (99%)",
    ),
  data_source: z
    .string()
    .describe(
      "Azure resource ID for metrics data source (Application Gateway or API Management)",
    ),
  evaluation_frequency: z
    .number()
    .optional()
    .default(DEFAULTS.evaluation_frequency)
    .describe("Default frequency in minutes to evaluate alarms. Default: 10"),
  evaluation_time_window: z
    .number()
    .optional()
    .default(DEFAULTS.evaluation_time_window)
    .describe(
      "Default time window in minutes for alarm evaluation. Default: 20",
    ),
  event_occurrences: z
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
  oa3_spec: z
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
  resource_type: z
    .enum(["app-gateway", "api-management"])
    .optional()
    .default("app-gateway")
    .describe(
      "Type of Azure resource to monitor: app-gateway (Application Gateway) or api-management (API Management). Default: app-gateway",
    ),
  response_time_threshold: z
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
});

export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type EndpointOverride = z.infer<typeof EndpointOverrideSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type Overrides = z.infer<typeof OverridesSchema>;
export type TerraformConfig = z.infer<typeof TerraformConfigSchema>;
export type { QueryConfig };
