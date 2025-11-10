import type { AzureConfig } from "@pagopa/dx-savemoney";

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
          "Report format: json, yaml, table, or detailed-json (default: table)",
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
        .option("--debug", "Enable debug logging")
        .action(async function (options) {
          try {
            // Load configuration
            const config: AzureConfig = await loadConfig(options.config);
            const finalConfig: AzureConfig = {
              ...config,
              debug: options.debug || false,
              preferredLocation: options.location || config.preferredLocation,
              timespanDays:
                Number.parseInt(options.days, 10) || config.timespanDays,
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
