import type { AzureConfig } from "@pagopa/dx-savemoney";

import { azure, loadConfig, loadThresholds } from "@pagopa/dx-savemoney";
import { Command } from "commander";

export const makeSavemoneyCommand = () =>
  new Command("savemoney")
    .description(
      "Analyze Azure subscriptions and report unused or inefficient resources",
    )
    .option("-c, --config <path>", "Path to configuration file (JSON)")
    .option(
      "-f, --format <format>",
      "Report format: json, table, detailed-json, or lint (default: table)",
      "table",
    )
    .option(
      "-l, --location <string>",
      "Preferred Azure location for resources",
      "italynorth",
    )
    .option("-d, --days <number>", "Number of days for metrics analysis", "30")
    .option("-v, --verbose", "Enable verbose logging")
    .option(
      "-t, --tags <tags>",
      "Filter resources by tags (key=value,key2=value2). Only resources matching ALL specified tags are analyzed.",
    )
    .option(
      "--thresholds <path>",
      'Explicit path to a thresholds config file. When omitted, searches the current directory upward for: .savemoneyrc, .savemoneyrc.json, .savemoneyrc.yaml, savemoney.config.js, or the "savemoney" key in package.json',
    )
    .action(async function (options) {
      try {
        // Load configuration
        const config: AzureConfig = await loadConfig(options.config);

        // Parse tag filter
        const filterTags = parseTagsOption(options.tags);

        // Load analysis thresholds (via cosmiconfig or explicit path)
        const thresholds = await loadThresholds(options.thresholds);

        const finalConfig: AzureConfig = {
          ...config,
          filterTags,
          preferredLocation: options.location || config.preferredLocation,
          thresholds,
          timespanDays:
            Number.parseInt(options.days, 10) || config.timespanDays,
          verbose: options.verbose || false,
        };
        // Run analysis
        await azure.analyzeAzureResources(finalConfig, options.format);
      } catch (error) {
        this.error(
          `Analysis failed: ${error instanceof Error ? error.message : error}`,
        );
      }
    });

/**
 * Parses a "key=value,key2=value2" string into a Record<string, string>.
 * Returns undefined when the option is not provided or empty.
 * Supports values that contain "=" (only the first "=" is treated as separator).
 */
function parseTagsOption(
  tagsOption: string | undefined,
): Record<string, string> | undefined {
  if (!tagsOption?.trim()) {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const pair of tagsOption.split(",")) {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key && rest.length > 0) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
