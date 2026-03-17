/**
 * Azure configuration loading utilities
 */

import { getLogger } from "@logtape/logtape";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";

import type { AzureConfig } from "./types.js";

import { ConfigSchema } from "../schema.js";

/**
 * Loads Azure configuration from a YAML file, environment variables, or interactive prompts.
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
 * @returns Azure configuration object with subscription IDs, settings and thresholds
 */
export async function loadAzureConfig(
  configPath?: string,
): Promise<AzureConfig> {
  if (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const rawYaml = yaml.load(raw);
      const parsed = ConfigSchema.parse(rawYaml);
      return {
        preferredLocation: parsed.azure.preferredLocation,
        subscriptionIds: parsed.azure.subscriptionIds,
        thresholds: parsed.azure.thresholds,
        timespanDays: parsed.azure.timespanDays,
      };
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  const logger = getLogger(["savemoney", "azure", "config"]);
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
