import type { AzureConfig, AzureSource } from "@pagopa/dx-savemoney";

import { azure, loadConfig } from "@pagopa/dx-savemoney";
import { Command, InvalidArgumentError } from "commander";
import { oraPromise } from "ora";
import { z } from "zod";

import { exitWithError } from "../command-errors.js";
import { GlobalOptions } from "../global-options.js";

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
      "Filter findings by resource tags (key=value key2=value2). Advisor subscription-level findings remain global.",
    )
    .option(
      "-s, --source <source>",
      "Restrict findings to a single source: 'advisor', 'custom', or 'all' (defaults to config file or all)",
      parseSourceOption,
    )
    .option(
      "--no-pricing",
      "Disable Azure Retail Prices enrichment (skips custom cost-at-risk estimates)",
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
          preferredLocation: resolveStringOption(
            options.location,
            config.preferredLocation,
            this.getOptionValueSource("location"),
          ),
          ...(options.pricing === false ? { pricing: { enabled: false } } : {}),
          sources: resolveSourcesOption(options.source, config.sources),
          timespanDays: resolveNumberOption(
            options.days,
            config.timespanDays,
            this.getOptionValueSource("days"),
          ),
          verbose: verbose ?? false,
        };

        // Run analysis showing a progress spinner on stderr so the CLI doesn't
        // look frozen during the (potentially several-minute) Azure round-trips.
        const reports = await oraPromise(
          azure.analyzeAzureResources(finalConfig),
          {
            failText: "Analysis failed",
            stream: process.stderr,
            successText: "Analysis complete",
            text: "Analyzing Azure resources",
          },
        );
        await azure.generateReport(reports, options.format);
      } catch (error) {
        exitWithError(this)(
          error instanceof Error
            ? new Error(`Analysis failed: ${error.message}`, { cause: error })
            : new Error(`Analysis failed: ${String(error)}`),
        );
      }
    });

const SourceSchema = z.enum(["advisor", "all", "custom"]);
type SourceOption = z.infer<typeof SourceSchema>;

/**
 * Parses the `--source` option via a zod enum, accepting `all`, `advisor`,
 * or `custom` and rejecting any other value with a Commander-friendly error.
 */
export function parseSourceOption(value: string): SourceOption {
  const result = SourceSchema.safeParse(value);
  if (!result.success) {
    throw new InvalidArgumentError(
      `Allowed values are: ${SourceSchema.options.join(", ")}`,
    );
  }
  return result.data;
}

/**
 * Parses an array of "key=value" strings (from commander variadic option) into a Map<string, string>.
 * Returns an empty Map when the option is not provided or empty.
 * Supports values that contain "=" (only the first "=" is treated as separator).
 */
export function parseTagsOption(
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

export function resolveNumberOption(
  option: string | undefined,
  configValue: number,
  source: string | undefined,
): number {
  if (source !== "cli") {
    return configValue;
  }
  const parsed = Number.parseInt(option ?? "", 10);
  return Number.isNaN(parsed) ? configValue : parsed;
}

/**
 * Resolves the source filter preserving the difference between an omitted
 * option (respect config/defaults) and an explicit `--source all` override.
 */
export function resolveSourcesOption(
  option: SourceOption | undefined,
  configSources: AzureSource[] | undefined,
): AzureSource[] {
  if (option === undefined) {
    return configSources ?? ["advisor", "custom"];
  }
  return option === "all" ? ["advisor", "custom"] : [option];
}

export function resolveStringOption(
  option: string | undefined,
  configValue: string,
  source: string | undefined,
): string {
  return source === "cli" && option ? option : configValue;
}
