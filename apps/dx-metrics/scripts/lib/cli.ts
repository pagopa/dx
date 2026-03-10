/** This module parses CLI arguments for the DX metrics import script. */

import path from "path";

export interface ImportCliOptions {
  since: string;
  entity: string;
  trackerCsv: string;
  force: boolean;
  configPath: string;
}

export class HelpRequestedError extends Error {
  constructor() {
    super("Help requested");
    this.name = "HelpRequestedError";
  }
}

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function getHelpText(): string {
  return `
Usage: npx tsx scripts/import.ts --since YYYY-MM-DD [options]

Required:
  --since YYYY-MM-DD        Start date for the import (e.g. 2024-01-01)

Options:
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
                              terraform-registry Terraform registry module releases
                              terraform-modules Terraform module usage (via terrawiz)
                              dx-pipelines      DX pipeline usages (via GitHub code search)
                              tracker           Tracker CSV data (requires --tracker-csv)

  --tracker-csv <path>      Path to the tracker CSV file (used with --entity tracker)
  --config <path>           Path to config YAML file (default: config.yaml)
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
  let configPath = path.resolve(workingDirectory, "config.yaml");

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

  if (!since) {
    throw new CliUsageError("--since YYYY-MM-DD is required.");
  }

  return { since, entity, trackerCsv, force, configPath };
}
