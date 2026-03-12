/**
 * Azure configuration loading utilities
 */

import { getLogger } from "@logtape/logtape";
import { cosmiconfig } from "cosmiconfig";
import * as fs from "fs";
import * as readline from "readline";

import type { Thresholds } from "../types.js";
import type { AzureConfig } from "./types.js";

import { DEFAULT_THRESHOLDS } from "../types.js";

/**
 * Loads Azure configuration from file, environment variables, or interactive prompts.
 *
 * @param configPath - Optional path to JSON configuration file
 * @returns Azure configuration object with subscription IDs and settings
 */
export async function loadAzureConfig(
  configPath?: string,
): Promise<AzureConfig> {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent) as Partial<AzureConfig>;

      if (!config.tenantId || !config.subscriptionIds) {
        throw new Error(
          "Config file must contain 'tenantId' and 'subscriptionIds'",
        );
      }

      return {
        ...config,
        preferredLocation: config.preferredLocation || "italynorth",
        subscriptionIds: config.subscriptionIds,
        tenantId: config.tenantId,
        timespanDays: config.timespanDays || 30,
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
 * Loads analysis thresholds by merging any user-defined overrides (discovered via cosmiconfig
 * under the module name "savemoney") on top of DEFAULT_THRESHOLDS.
 *
 * Supported config files (searched from CWD upward):
 *   .savemoneyrc, .savemoneyrc.json, .savemoneyrc.yaml,
 *   savemoney.config.js, savemoney.config.cjs, or "savemoney" key in package.json
 *
 * @param explicitPath - Optional explicit path to a thresholds config file
 * @returns Merged thresholds
 */
export async function loadThresholds(
  explicitPath?: string,
): Promise<Thresholds> {
  const explorer = cosmiconfig("savemoney");

  try {
    const result = explicitPath
      ? await explorer.load(explicitPath)
      : await explorer.search();

    if (!result || result.isEmpty) {
      return DEFAULT_THRESHOLDS;
    }

    const userConfig = result.config as Partial<Thresholds>;

    // Deep-merge user overrides onto defaults
    return {
      appService: {
        ...DEFAULT_THRESHOLDS.appService,
        ...userConfig.appService,
      },
      containerApp: {
        ...DEFAULT_THRESHOLDS.containerApp,
        ...userConfig.containerApp,
      },
      publicIp: { ...DEFAULT_THRESHOLDS.publicIp, ...userConfig.publicIp },
      staticSite: {
        ...DEFAULT_THRESHOLDS.staticSite,
        ...userConfig.staticSite,
      },
      storage: { ...DEFAULT_THRESHOLDS.storage, ...userConfig.storage },
      vm: { ...DEFAULT_THRESHOLDS.vm, ...userConfig.vm },
    };
  } catch {
    // If config loading fails, fall back to defaults
    const logger = getLogger(["savemoney", "config"]);
    logger.warn("Failed to load threshold config, using defaults.");
    return DEFAULT_THRESHOLDS;
  }
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
