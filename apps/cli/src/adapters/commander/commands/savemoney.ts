import type { AzureConfig } from "@pagopa/dx-savemoney";

import { configure, getConsoleSink } from "@logtape/logtape";
import { azure, loadConfig } from "@pagopa/dx-savemoney";
import { Command } from "commander";

const makeAzureCommand = () =>
  new Command("azure")
    .description(
      "Analyze Azure subscriptions and report unused or inefficient resources",
    )
    .option("-c, --config <path>", "Path to configuration file (JSON)")
    .option(
      "-f, --format <format>",
      "Report format: json, table, or detailed-json (default: table)",
      "table",
    )
    .option(
      "-l, --location <string>",
      "Preferred Azure location for resources",
      "italynorth",
    )
    .option("-d, --days <number>", "Number of days for metrics analysis", "30")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async function (options) {
      try {
        // Configure LogTape for verbose mode
        if (options.verbose) {
          await configure({
            loggers: [
              {
                category: ["savemoney"],
                lowestLevel: "debug",
                sinks: ["console"],
              },
              {
                category: ["logtape", "meta"],
                lowestLevel: "warning",
                sinks: ["console"],
              },
            ],
            reset: true,
            sinks: {
              console: getConsoleSink(),
            },
          });
        }

        // Load configuration
        const config: AzureConfig = await loadConfig(options.config);
        const finalConfig: AzureConfig = {
          ...config,
          preferredLocation: options.location || config.preferredLocation,
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

const makeAwsCommand = () =>
  new Command("aws")
    .description(
      "Analyze AWS accounts and report unused or inefficient resources (Coming soon)",
    )
    .action(function () {
      this.error(
        "AWS support is not yet implemented. Currently only Azure is supported.",
      );
    });

export const makeSavemoneyCommand = () => {
  const savemoneyCmd = new Command("savemoney").description(
    "Analyze CSP resources for cost optimization opportunities",
  );

  // Add subcommands
  savemoneyCmd.addCommand(makeAzureCommand());
  savemoneyCmd.addCommand(makeAwsCommand());

  // Custom help to show available CSPs
  savemoneyCmd.addHelpText(
    "after",
    `
Examples:
  $ dx savemoney azure -c config.json
  $ dx savemoney azure -c config.json --verbose
  $ dx savemoney aws

Note: Use 'dx savemoney <csp> --help' for CSP-specific options.
`,
  );

  return savemoneyCmd;
};
