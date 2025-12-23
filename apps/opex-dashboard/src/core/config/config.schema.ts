/**
 * Configuration schema using Zod.
 * Defines and validates the structure of YAML configuration files.
 */

import { z } from "zod";

import {
  EndpointOverridePropertiesSchema,
  EndpointOverridePropertiesSchemaRaw,
  transformEndpointOverrideProperties,
} from "../shared/endpoint-properties.schema.js";
import {
  QueryConfig,
  QueryConfigSchema,
  QueryConfigSchemaRaw,
  transformQueryConfig,
} from "../shared/query-config.schema.js";
import { DEFAULTS } from "./defaults.js";

// Raw schema for endpoint overrides (snake_case)
const EndpointOverrideSchemaRaw = EndpointOverridePropertiesSchemaRaw;

// Transformed schema for endpoint overrides (camelCase)
const EndpointOverrideSchema = EndpointOverridePropertiesSchema;

// Raw schema for overrides section (snake_case)
const OverridesSchemaRaw = z.object({
  endpoints: z
    .record(z.string(), EndpointOverrideSchemaRaw)
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
  queries: QueryConfigSchemaRaw.optional().describe(
    "Optional query configuration overrides",
  ),
});

// Transformed schema for overrides section (camelCase)
const OverridesSchema = z.object({
  endpoints: z.record(z.string(), EndpointOverrideSchema).optional(),
  hosts: z.array(z.string()).optional(),
  queries: QueryConfigSchema.optional(),
});

// Raw schema for Terraform backend configuration (snake_case)
const BackendConfigSchemaRaw = z.object({
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

// Transformed schema for Terraform backend configuration (camelCase)
const BackendConfigSchema = z.object({
  containerName: z.string(),
  key: z.string(),
  resourceGroupName: z.string(),
  storageAccountName: z.string(),
});

// Raw schema for environment-specific configuration (snake_case)
const EnvironmentConfigSchemaRaw = z.object({
  backend: BackendConfigSchemaRaw.optional().describe(
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

// Transformed schema for environment-specific configuration (camelCase)
const EnvironmentConfigSchema = z.object({
  backend: BackendConfigSchema.optional(),
  envShort: z.string().max(1),
  prefix: z.string().max(6),
});

// Raw schema for Terraform configuration (snake_case)
const TerraformConfigSchemaRaw = z.object({
  environments: z
    .object({
      dev: EnvironmentConfigSchemaRaw.optional(),
      prod: EnvironmentConfigSchemaRaw.optional(),
      uat: EnvironmentConfigSchemaRaw.optional(),
    })
    .optional()
    .describe("Environment-specific configurations for dev/uat/prod"),
});

// Transformed schema for Terraform configuration (camelCase)
const TerraformConfigSchema = z.object({
  environments: z
    .object({
      dev: EnvironmentConfigSchema.optional(),
      prod: EnvironmentConfigSchema.optional(),
      uat: EnvironmentConfigSchema.optional(),
    })
    .optional(),
});

// Raw main configuration schema with snake_case naming (matching YAML input)
export const ConfigSchemaRaw = z.object({
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
  overrides: OverridesSchemaRaw.optional().describe(
    "Optional overrides for hosts, per-endpoint alarm thresholds, and query configurations",
  ),
  queries: QueryConfigSchemaRaw.optional().describe(
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
  terraform: TerraformConfigSchemaRaw.optional().describe(
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

// Main configuration schema with camelCase for internal use
export const ConfigSchema = z.object({
  actionGroups: z.array(z.string()),
  availabilityThreshold: z.number(),
  dataSource: z.string(),
  evaluationFrequency: z.number(),
  evaluationTimeWindow: z.number(),
  eventOccurrences: z.number(),
  location: z.string(),
  name: z.string(),
  oa3Spec: z.string(),
  overrides: OverridesSchema.optional(),
  queries: QueryConfigSchema.optional(),
  resourceType: z.enum(["app-gateway", "api-management"]),
  responseTimeThreshold: z.number(),
  terraform: TerraformConfigSchema.optional(),
  timespan: z.string(),
});

export type BackendConfig = z.infer<typeof BackendConfigSchema>;

export type BackendConfigRaw = z.infer<typeof BackendConfigSchemaRaw>;

export type Config = z.infer<typeof ConfigSchema>;

export type ConfigRaw = z.infer<typeof ConfigSchemaRaw>;

export type EndpointOverride = z.infer<typeof EndpointOverrideSchema>;

export type EndpointOverrideRaw = z.infer<typeof EndpointOverrideSchemaRaw>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type EnvironmentConfigRaw = z.infer<typeof EnvironmentConfigSchemaRaw>;
export type Overrides = z.infer<typeof OverridesSchema>;
export type OverridesRaw = z.infer<typeof OverridesSchemaRaw>;
export type TerraformConfig = z.infer<typeof TerraformConfigSchema>;
export type TerraformConfigRaw = z.infer<typeof TerraformConfigSchemaRaw>;
/**
 * Transform raw configuration from snake_case to camelCase.
 * Called after validating with ConfigSchemaRaw.
 */
export function transformConfig(raw: ConfigRaw): Config {
  return {
    actionGroups: raw.action_groups,
    availabilityThreshold: raw.availability_threshold,
    dataSource: raw.data_source,
    evaluationFrequency: raw.evaluation_frequency,
    evaluationTimeWindow: raw.evaluation_time_window,
    eventOccurrences: raw.event_occurrences,
    location: raw.location,
    name: raw.name,
    oa3Spec: raw.oa3_spec,
    ...(raw.overrides && { overrides: transformOverrides(raw.overrides) }),
    ...(raw.queries && { queries: transformQueryConfig(raw.queries) }),
    resourceType: raw.resource_type,
    responseTimeThreshold: raw.response_time_threshold,
    ...(raw.terraform && {
      terraform: transformTerraformConfig(raw.terraform),
    }),
    timespan: raw.timespan,
  };
}
/**
 * Transform raw config from snake_case to camelCase.
 * This is called after validating with ConfigSchemaRaw.
 */
function transformBackendConfig(raw: BackendConfigRaw): BackendConfig {
  return {
    containerName: raw.container_name,
    key: raw.key,
    resourceGroupName: raw.resource_group_name,
    storageAccountName: raw.storage_account_name,
  };
}
function transformEnvironmentConfig(
  raw: EnvironmentConfigRaw,
): EnvironmentConfig {
  return {
    ...(raw.backend && { backend: transformBackendConfig(raw.backend) }),
    envShort: raw.env_short,
    prefix: raw.prefix,
  };
}
function transformOverrides(raw: OverridesRaw): Overrides {
  const result: Overrides = {};

  if (raw.endpoints) {
    result.endpoints = {};
    for (const [key, value] of Object.entries(raw.endpoints)) {
      result.endpoints[key] = transformEndpointOverrideProperties(value);
    }
  }

  if (raw.hosts) {
    result.hosts = raw.hosts;
  }

  if (raw.queries) {
    result.queries = transformQueryConfig(raw.queries);
  }

  return result;
}
function transformTerraformConfig(raw: TerraformConfigRaw): TerraformConfig {
  if (!raw.environments) {
    return {};
  }

  return {
    environments: {
      ...(raw.environments.dev && {
        dev: transformEnvironmentConfig(raw.environments.dev),
      }),
      ...(raw.environments.prod && {
        prod: transformEnvironmentConfig(raw.environments.prod),
      }),
      ...(raw.environments.uat && {
        uat: transformEnvironmentConfig(raw.environments.uat),
      }),
    },
  };
}
export type { QueryConfig };
