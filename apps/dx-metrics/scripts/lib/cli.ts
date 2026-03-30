/** This module parses CLI arguments for the DX metrics import script. */

import path from "path";

export interface ImportCliOptions {
  configPath: string;
  entity: string;
  force: boolean;
  since: string;
  trackerCsv: string;
}

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export class HelpRequestedError extends Error {
  constructor() {
    super("Help requested");
    this.name = "HelpRequestedError";
  }
}

/**
 * Computes a "since" date by subtracting a number of days from today.
 * Used as the fallback when --since is not provided on the CLI.
 *
 * @param importSinceDays - Raw string from the IMPORT_SINCE_DAYS env var.
 * @param defaultDays - Fallback when the env var is missing or invalid (default 30).
 * @returns An ISO date string in YYYY-MM-DD format.
 */
export function computeSinceDate(
  importSinceDays?: string,
  defaultDays = 30,
): string {
  const parsed = parseInt(importSinceDays ?? "", 10);
  const days = Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultDays;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function getHelpText(): string {
  return `
Usage: npx tsx scripts/import.ts [options]

Options:
  --since YYYY-MM-DD        Start date for the import (e.g. 2024-01-01).
                            If omitted, computed from the IMPORT_SINCE_DAYS
                            environment variable (default: 30 days ago).

  --entity <type>           Import only the specified entity type (default: all)
                            Valid values:
                              all               Import everything
                              pull-requests     GitHub pull requests
                              pr-reviews        GitHub pull request reviews
                              workflows         GitHub Actions workflow definitions
                              workflow-runs     GitHub Actions workflow run history
                              iac-pr            IaC pull request lead time
                              commits           Repository commits
                               code-search       Code search results (DX repo)
                               tech-radar        Discoverable tool usage aligned to DX Techradar
                               terraform-registry Terraform registry module releases
                               terraform-modules Terraform module usage (via terrawiz)
                               dx-pipelines      DX pipeline usages (via GitHub code search)
                              tracker           Tracker CSV data (requires --tracker-csv)

  --tracker-csv <path>      Path to the tracker CSV file (used with --entity tracker)
  --config <path>           Path to config JSON file (default: config.json)
  --force                   Re-import even if a checkpoint already exists
  --help                    Show this help message
`;
}

export function parseArgs(
  argv: readonly string[],
  workingDirectory: string,
): ImportCliOptions {
  let since = "";
  let entity = "all";
  let trackerCsv = "";
  let force = false;
  let configPath = path.resolve(workingDirectory, "config.json");

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextArgument = argv[index + 1];

    if (argument === "--help" || argument === "-h") {
      throw new HelpRequestedError();
    }

    if (argument === "--since" && nextArgument) {
      since = nextArgument;
      index += 1;
      continue;
    }

    if (argument === "--entity" && nextArgument) {
      entity = nextArgument;
      index += 1;
      continue;
    }

    if (argument === "--tracker-csv" && nextArgument) {
      trackerCsv = nextArgument;
      index += 1;
      continue;
    }

    if (argument === "--config" && nextArgument) {
      configPath = path.resolve(workingDirectory, nextArgument);
      index += 1;
      continue;
    }

    if (argument === "--force") {
      force = true;
    }
  }

  return { configPath, entity, force, since, trackerCsv };
}
