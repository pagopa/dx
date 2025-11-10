/**
 * SaveMoney Package
 *
 * A tool that analyzes cloud resources and reports potentially unused
 * or cost-inefficient ones.
 *
 * Features:
 * - Multi-cloud support (Azure, AWS planned)
 * - Metric-based analysis
 * - Multiple output formats (table, JSON, YAML, detailed-JSON)
 * - Configurable via CLI options, environment variables, or config file
 *
 * This tool does NOT modify, tag, or delete any resources.
 */

// Export common types
export type { AzureConfig } from "./azure/types.js";
export * from "./types.js";

// Export Azure module
import * as azureModule from "./azure/index.js";
export const azure = azureModule;

// Utility imports for loadConfig and prompt functions
import * as fs from "fs";
import * as readline from "readline";

import type { AzureConfig } from "./azure/types.js";

/**
 * Loads configuration from file, environment variables, or interactive prompts.
 *
 * @param configPath - Optional path to JSON configuration file
 * @returns Configuration object with subscription IDs and settings
 */
export async function loadConfig(configPath?: string): Promise<AzureConfig> {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);

      // Validate required fields
      if (!config.tenantId || !config.subscriptionIds) {
        throw new Error(
          "Config file must contain 'tenantId' and 'subscriptionIds'",
        );
      }

      return {
        ...config,
        preferredLocation: config.preferredLocation || "italynorth",
        timespanDays: config.timespanDays || 30,
      };
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(
    "Configuration file not found. Checking environment variables...",
  );

  const tenantId =
    process.env.ARM_TENANT_ID || (await prompt("Enter Tenant ID: "));
  const subscriptionIds = process.env.ARM_SUBSCRIPTION_ID
    ? process.env.ARM_SUBSCRIPTION_ID.split(",")
    : (await prompt("Enter Subscription IDs (comma-separated): ")).split(",");

  return {
    preferredLocation: "italynorth",
    subscriptionIds,
    tenantId,
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
