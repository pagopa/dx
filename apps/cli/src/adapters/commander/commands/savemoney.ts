import type { AzureConfig } from "@pagopa/dx-savemoney";

import { configure, getConsoleSink } from "@logtape/logtape";
import { azure, loadConfig } from "@pagopa/dx-savemoney";
import { Command } from "commander";

export const makeSavemoneyCommand = () =>
  new Command("savemoney")
    .description("Analyze CSP resources for cost optimization opportunities")
    .addCommand(
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
        .option(
          "-d, --days <number>",
          "Number of days for metrics analysis",
          "30",
        )
        .option("-v, --verbose", "Enable verbose logging")
        .action(async function (options) {
          try {
            // Configure LogTape for verbose mode
            if (options.verbose) {
              await configure({
                loggers: [
                  {
                    category: ["dx-savemoney"],
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
        }),
    );
