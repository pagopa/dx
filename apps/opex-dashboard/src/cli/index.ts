/**
 * CLI entry point for opex-dashboard.
 * Provides commands for generating operational dashboards from OpenAPI specs.
 */

import { Command } from "commander";

import { createGenerateCommand } from "./commands/generate.js";

const program = new Command();

program
  .name("opex_dashboard")
  .description("Generate operational dashboards from OpenAPI 3 specifications");

// Register commands
program.addCommand(createGenerateCommand()).version(__CLI_VERSION__);

// Parse arguments
program.parse(process.argv);
