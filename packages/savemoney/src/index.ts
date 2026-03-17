/**
 * SaveMoney Package
 *
 * A tool that analyzes cloud resources and reports potentially unused
 * or cost-inefficient ones.
 *
 * Features:
 * - Multi-cloud support (Azure, AWS planned)
 * - Metric-based analysis
 * - Multiple output formats (table, JSON, detailed-JSON)
 * - Configurable via CLI options, environment variables, or config file
 *
 * This tool does NOT modify, tag, or delete any resources.
 */

// Export common types
export type { AzureConfig } from "./azure/types.js";

// Export Azure module
import * as azureModule from "./azure/index.js";
export const azure = azureModule;

export * from "./types.js";

import { getLogger } from "@logtape/logtape";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";

import type { AzureConfig } from "./azure/types.js";

import { sanitizeThresholds } from "./azure/config.js";

type YamlAzureSection = {
  preferredLocation?: string;
  subscriptionIds?: string[];
  thresholds?: Record<string, unknown>;
  timespanDays?: number;
};

/**
 * Loads configuration from a YAML file, environment variables, or interactive prompts.
 *
 * The YAML file should have an `azure` top-level key:
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
 * @returns Configuration object with subscription IDs, settings and thresholds
 */
export async function loadConfig(configPath?: string): Promise<AzureConfig> {
  const logger = getLogger(["savemoney", "config"]);

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = yaml.load(raw) as Record<string, unknown>;
      const azureSection = (
        typeof parsed?.azure === "object" && parsed.azure !== null
          ? parsed.azure
          : {}
      ) as YamlAzureSection;

      if (
        !azureSection.subscriptionIds ||
        azureSection.subscriptionIds.length === 0
      ) {
        throw new Error(
          "Config file must contain at least one entry in 'azure.subscriptionIds'",
        );
      }

      return {
        preferredLocation: azureSection.preferredLocation ?? "italynorth",
        subscriptionIds: azureSection.subscriptionIds,
        thresholds: sanitizeThresholds(azureSection.thresholds),
        timespanDays: azureSection.timespanDays ?? 30,
      };
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  logger.info(
    "Configuration file not found. Checking environment variables...",
  );

  const subscriptionIds = process.env.ARM_SUBSCRIPTION_ID
    ? process.env.ARM_SUBSCRIPTION_ID.split(",")
    : (await prompt("Enter Subscription IDs (comma-separated): ")).split(",");

  return {
    preferredLocation: "italynorth",
    subscriptionIds,
    timespanDays: 30,
  };
}

/**
 * Prompts user for input via stdin.
 *
 * @param question - The question to display to the user
 * @returns User's input as a string
 */
export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
}
