/**
 * CLI entrypoint for dx-az-savemoney standalone tool
 */

import { Command } from "commander";

import { analyzeResources, loadConfig, setDebugMode } from "./index.js";

const program = new Command();

program
  .name("dx-az-save-money")
  .description(
    "Analyze Azure resources and generate a report of potentially unused or cost-inefficient ones.",
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
  .option("-d, --days <number>", "Number of days for metrics analysis", "30")
  .option("--debug", "Enable debug logging")
  .action(async (options) => {
    try {
      // Set debug mode based on command line flag
      setDebugMode(options.debug || false);

      const config = await loadConfig(options.config);
      config.timespanDays =
        Number.parseInt(options.days, 10) || config.timespanDays;
      config.preferredLocation = options.location || config.preferredLocation;

      await analyzeResources(config, options.format);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(process.argv);
