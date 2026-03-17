/**
 * Azure configuration loading utilities
 */

import { getLogger } from "@logtape/logtape";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as readline from "readline";

import type { Thresholds } from "../types.js";
import type { AzureConfig } from "./types.js";

import { DEFAULT_THRESHOLDS } from "../types.js";

/**
 * Shape of the `azure` section inside the YAML config file.
 */
type YamlAzureSection = {
  preferredLocation?: string;
  subscriptionIds?: string[];
  thresholds?: Record<string, unknown>;
  timespanDays?: number;
};

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
      const parsed = yaml.load(raw) as Record<string, unknown>;
      const azureSection = (
        typeof parsed?.azure === "object" && parsed.azure !== null
          ? parsed.azure
          : {}
      ) as YamlAzureSection;

      const subscriptionIds = azureSection.subscriptionIds;
      if (!subscriptionIds || subscriptionIds.length === 0) {
        throw new Error(
          "Config file must contain at least one entry in 'azure.subscriptionIds'",
        );
      }

      return {
        preferredLocation: azureSection.preferredLocation ?? "italynorth",
        subscriptionIds,
        thresholds: sanitizeThresholds(azureSection.thresholds),
        timespanDays: azureSection.timespanDays ?? 30,
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

/**
 * Builds a fully-merged Thresholds object from the raw `thresholds` section
 * of the YAML config, deep-merging onto DEFAULT_THRESHOLDS and sanitizing
 * any non-numeric values.
 *
 * @param raw - The raw `azure.thresholds` value from the YAML file (may be undefined)
 * @returns Merged and validated Thresholds
 */
export function sanitizeThresholds(
  raw: Record<string, unknown> | undefined,
): Thresholds {
  if (!raw) return DEFAULT_THRESHOLDS;

  const sanitizeSection = (
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

  return {
    appService: sanitizeSection(
      DEFAULT_THRESHOLDS.appService,
      raw.appService,
    ) as Thresholds["appService"],
    containerApp: sanitizeSection(
      DEFAULT_THRESHOLDS.containerApp,
      raw.containerApp,
    ) as Thresholds["containerApp"],
    publicIp: sanitizeSection(
      DEFAULT_THRESHOLDS.publicIp,
      raw.publicIp,
    ) as Thresholds["publicIp"],
    staticSite: sanitizeSection(
      DEFAULT_THRESHOLDS.staticSite,
      raw.staticSite,
    ) as Thresholds["staticSite"],
    storage: sanitizeSection(
      DEFAULT_THRESHOLDS.storage,
      raw.storage,
    ) as Thresholds["storage"],
    vm: sanitizeSection(DEFAULT_THRESHOLDS.vm, raw.vm) as Thresholds["vm"],
  };
}
