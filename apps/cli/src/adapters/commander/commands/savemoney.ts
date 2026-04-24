import type { AzureConfig } from "@pagopa/dx-savemoney";

import { azure, loadConfig } from "@pagopa/dx-savemoney";
import { Command } from "commander";

import { exitWithError, GlobalOptions } from "../index.js";

export const makeSavemoneyCommand = () =>
  new Command("savemoney")
    .description(
      "Analyze Azure subscriptions and report unused or inefficient resources",
    )
    .option("-c, --config <path>", "Path to YAML configuration file")
    .option(
      "-f, --format <format>",
      "Report format: json, table, detailed-json, or lint (default: table)",
      "table",
    )
    .option(
      "-l, --location <string>",
      "Preferred Azure location for resources (overrides config file)",
      "italynorth",
    )
    .option(
      "-d, --days <number>",
      "Number of days for metrics analysis (overrides config file)",
      "30",
    )
    .option(
      "-t, --tags <tags...>",
      "Filter resources by tags (key=value key2=value2). Only resources matching ALL specified tags are analyzed.",
    )
    .action(async function (options) {
      const { verbose } = this.optsWithGlobals<GlobalOptions>();
      try {
        // Load configuration from YAML (includes subscriptionIds, location, timespanDays, thresholds)
        const config: AzureConfig = await loadConfig(options.config);

        // Parse tag filter
        const filterTags = parseTagsOption(options.tags);

        const finalConfig: AzureConfig = {
          ...config,
          filterTags,
          preferredLocation: options.location || config.preferredLocation,
          timespanDays:
            Number.parseInt(options.days, 10) || config.timespanDays,
          verbose: verbose ?? false,
        };
        // Run analysis
        await azure.analyzeAzureResources(finalConfig, options.format);
      } catch (error) {
        exitWithError(this)(
          error instanceof Error
            ? new Error(`Analysis failed: ${error.message}`, { cause: error })
            : new Error(`Analysis failed: ${String(error)}`),
        );
      }
    });

/**
 * Parses an array of "key=value" strings (from commander variadic option) into a Map<string, string>.
 * Returns an empty Map when the option is not provided or empty.
 * Supports values that contain "=" (only the first "=" is treated as separator).
 */
function parseTagsOption(
  tagsOption: string[] | undefined,
): Map<string, string> {
  const result = new Map<string, string>();
  if (!tagsOption || tagsOption.length === 0) {
    return result;
  }
  for (const pair of tagsOption) {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key && rest.length > 0) {
      result.set(key, value);
    }
  }
  return result;
}
