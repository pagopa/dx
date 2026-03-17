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

import type { AzureConfig } from "./azure/types.js";

import { loadAzureConfig } from "./azure/config.js";

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
  return loadAzureConfig(configPath);
}
