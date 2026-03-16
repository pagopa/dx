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

    const userConfig = result.config as Record<string, unknown>;
    // Read thresholds from the "azure" namespace to allow future cloud-specific sections
    const azureConfig = (
      typeof userConfig.azure === "object" && userConfig.azure !== null
        ? userConfig.azure
        : {}
    ) as Record<string, unknown>;

    // Strip any non-numeric values to prevent invalid config from propagating
    const sanitize = (
      defaults: Record<string, number>,
      overrides: unknown,
    ): Record<string, number> => {
      if (!overrides || typeof overrides !== "object") return defaults;
      const out: Record<string, number> = { ...defaults };
      for (const [key, val] of Object.entries(
        overrides as Record<string, unknown>,
      )) {
        if (typeof val === "number" && Number.isFinite(val)) {
          out[key] = val;
        } else if (val !== undefined) {
          const logger = getLogger(["savemoney", "config"]);
          logger.warn(
            `Ignoring invalid threshold value for "${key}": expected a finite number, got ${JSON.stringify(val)}.`,
          );
        }
      }
      return out;
    };

    // Deep-merge user overrides onto defaults
    return {
      appService: sanitize(
        DEFAULT_THRESHOLDS.appService,
        azureConfig.appService,
      ) as Thresholds["appService"],
      containerApp: sanitize(
        DEFAULT_THRESHOLDS.containerApp,
        azureConfig.containerApp,
      ) as Thresholds["containerApp"],
      publicIp: sanitize(
        DEFAULT_THRESHOLDS.publicIp,
        azureConfig.publicIp,
      ) as Thresholds["publicIp"],
      staticSite: sanitize(
        DEFAULT_THRESHOLDS.staticSite,
        azureConfig.staticSite,
      ) as Thresholds["staticSite"],
      storage: sanitize(
        DEFAULT_THRESHOLDS.storage,
        azureConfig.storage,
      ) as Thresholds["storage"],
      vm: sanitize(DEFAULT_THRESHOLDS.vm, azureConfig.vm) as Thresholds["vm"],
    };
  } catch (error) {
    // Fall back to defaults and surface the error so misconfigured paths are diagnosable
    const logger = getLogger(["savemoney", "config"]);
    const detail = error instanceof Error ? error.message : String(error);
    const location = explicitPath ?? "(auto-discovered)";
    logger.warn(
      `Failed to load threshold config from ${location}: ${detail}. Using defaults.`,
    );
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
