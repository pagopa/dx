import type { LogLevel } from "@logtape/logtape";

import { z } from "zod";

import { type AwsRuntimeConfig } from "./config/aws.js";
import { type AzureMonitoringConfig } from "./config/monitoring.js";
import { formatZodIssues } from "./utils/errors.js";
import { normalizeBoolean } from "./utils/normalize-boolean.js";

export type AppConfig = {
  aws: AwsRuntimeConfig;
  github: {
    requiredOrganizations: string[];
    searchOrg: string;
  };
  logLevel: LogLevel;
  monitoring: AzureMonitoringConfig;
  port: number;
};

export const DEFAULT_PORT = 8080;

const logLevelSchema = z
  .enum(["debug", "info", "warning", "error"])
  .default("info");

export const envSchema = z.object({
  APPINSIGHTS_SAMPLING_PERCENTAGE: z.coerce.number().min(0).max(100).optional(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
  AWS_REGION: z.string().optional(),
  BEDROCK_KB_RERANKING_ENABLED: z.string().optional(),
  BEDROCK_KNOWLEDGE_BASE_ID: z.string().optional(),
  GITHUB_SEARCH_ORG: z.string().optional(),
  LOG_LEVEL: logLevelSchema,
  PORT: z.coerce.number().int().positive().optional(),
  REQUIRED_ORGANIZATIONS: z.string().optional(),
});

/**
 * Loads and validates the application configuration from environment variables.
 *
 * @param env - The environment variables object (usually process.env)
 * @returns The validated application configuration
 * @throws Error if environment variables fail validation
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsedEnv = envSchema.safeParse(env);
  if (!parsedEnv.success) {
    throw new Error(
      `Invalid environment variables: ${formatZodIssues(parsedEnv.error.issues)}`,
    );
  }

  const rawEnv = parsedEnv.data;
  const port = rawEnv.PORT ?? DEFAULT_PORT;
  const rerankingEnabled = normalizeBoolean(
    rawEnv.BEDROCK_KB_RERANKING_ENABLED,
    true,
  );

  return {
    aws: {
      knowledgeBaseId: rawEnv.BEDROCK_KNOWLEDGE_BASE_ID ?? "",
      region: rawEnv.AWS_REGION ?? "eu-central-1",
      rerankingEnabled,
    },
    github: {
      requiredOrganizations: parseRequiredOrganizations(
        rawEnv.REQUIRED_ORGANIZATIONS,
      ),
      searchOrg: rawEnv.GITHUB_SEARCH_ORG ?? "pagopa",
    },
    logLevel: rawEnv.LOG_LEVEL,
    monitoring: {
      connectionString: rawEnv.APPLICATIONINSIGHTS_CONNECTION_STRING,
      samplingRatio: (rawEnv.APPINSIGHTS_SAMPLING_PERCENTAGE ?? 5) / 100,
    },
    port,
  };
}

/**
 * Parses a comma-separated list of organization names from a string.
 * Defaults to ["pagopa"] if the list is empty or undefined.
 *
 * @param value - Comma-separated organization names
 * @returns Array of organization names
 */
export function parseRequiredOrganizations(
  value: string | undefined,
): string[] {
  const organizations = (value ?? "")
    .split(",")
    .map((org) => org.trim())
    .filter(Boolean);
  return organizations.length > 0 ? organizations : ["pagopa"];
}
