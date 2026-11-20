/**
 * Azure configuration loading utilities
 */

import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";
import { z } from "zod";

import type { AzureConfig } from "./types.js";

import { ConfigSchema } from "../schema.js";

const ConfigSchemaWithoutSubscriptionIds = z
  .object({
    azure: ConfigSchema.shape.azure
      .omit({ subscriptionIds: true })
      .extend({ subscriptionIds: z.unknown().optional() }),
  })
  .strict();

export type AzureConfigLoadOptions = {
  interactive?: boolean;
  subscriptionIds?: string[];
};

type ConfigWithoutSubscriptionIds = z.infer<
  typeof ConfigSchemaWithoutSubscriptionIds
>;

/**
 * Loads Azure configuration from CLI overrides, a YAML file, environment
 * variables, or interactive prompts, in that order.
 *
 * The YAML file must have an `azure` top-level key:
 * ```yaml
 * azure:
 *   subscriptionIds:
 *     - xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   preferredLocation: italynorth
 *   timespanDays: 30
 *   thresholds:
 *     vm:
 *       cpuPercent: 5
 * ```
 *
 * @param configPath - Optional path to a YAML configuration file
 * @param options - Optional subscription override and prompt behavior
 * @returns Azure configuration object with subscription IDs, settings and thresholds
 */
export async function loadAzureConfig(
  configPath?: string,
  options: AzureConfigLoadOptions = {},
): Promise<AzureConfig> {
  const config = configPath
    ? parseConfig(
        ConfigSchemaWithoutSubscriptionIds,
        readConfigFile(configPath),
        configPath,
      )
    : undefined;
  const subscriptionIds = await resolveSubscriptionIds(config, options);
  const value = config
    ? { ...config, azure: { ...config.azure, subscriptionIds } }
    : { azure: { subscriptionIds } };
  return parseConfig(ConfigSchema, value, configPath).azure;
}

/**
 * Prompts user for input via stdin.
 *
 * @param question - The question to display to the user
 * @returns User's input as a string
 */
export async function prompt(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Cannot prompt for subscription IDs without a terminal.");
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve, reject) => {
    let answered = false;
    rl.once("close", () => {
      if (!answered) {
        reject(
          new Error("Subscription ID prompt was closed before an answer."),
        );
      }
    });
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
  });
}

function missingSubscriptionIds(): never {
  throw new Error(
    "Subscription IDs are required. Pass --subscriptionIds, set ARM_SUBSCRIPTION_ID, or add azure.subscriptionIds to a config file.",
  );
}

function parseConfig<T>(
  schema: z.ZodType<T>,
  value: unknown,
  configPath?: string,
): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    throw new Error(
      `${configPath ? "Invalid config file" : "Invalid configuration"}:\n${z.prettifyError(error)}`,
      { cause: error },
    );
  }
}

function readConfigFile(configPath: string): unknown {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  try {
    return yaml.load(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    throw new Error(
      `Failed to load config file: ${error instanceof Error ? error.message : error}`,
      { cause: error },
    );
  }
}

async function resolveSubscriptionIds(
  config: ConfigWithoutSubscriptionIds | undefined,
  options: AzureConfigLoadOptions,
): Promise<unknown> {
  const environmentValue = process.env.ARM_SUBSCRIPTION_ID?.trim();
  const environmentIds = environmentValue
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (options.subscriptionIds !== undefined) return options.subscriptionIds;
  if (config && Object.hasOwn(config.azure, "subscriptionIds")) {
    return config.azure.subscriptionIds;
  }
  if (environmentIds?.length) return environmentIds;
  if (options.interactive !== false && process.stdin.isTTY) {
    const ids = (await prompt("Enter Subscription IDs (comma-separated): "))
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) return missingSubscriptionIds();
    return ids;
  }
  return missingSubscriptionIds();
}
