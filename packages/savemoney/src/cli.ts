#!/usr/bin/env node

/** SaveMoney executable; kept separate to preserve side-effect-free imports. */

import { configure, getConsoleSink } from "@logtape/logtape";
import { Command, InvalidArgumentError, Option } from "commander";
import { Console } from "node:console";
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { oraPromise } from "ora";
import { z } from "zod";

import type { AzureConfig } from "./azure/types.js";

import { azure, loadConfig } from "./index.js";
import { AZURE_SOURCE_VALUES } from "./schema.js";

type AnalyzeOptions = {
  azqrReport?: string;
  config?: string;
  days?: number;
  format: ReportFormat;
  location?: string;
  pricing: boolean;
  source?: "advisor" | "all" | "custom";
  subscriptionIds?: string[];
  tags?: string[];
  verbose: boolean;
};
type ReportFormat = "detailed-json" | "json" | "lint" | "table";

type SavemoneyDependencies = {
  analyzeAzureResources: typeof azure.analyzeAzureResources;
  generateReport: typeof azure.generateReport;
  loadConfig: typeof loadConfig;
};

const reportFormats = ["table", "json", "detailed-json", "lint"] as const;
const sources = [...AZURE_SOURCE_VALUES, "all"] as const;

export function makeSavemoneyCli(
  version: string,
  dependencies: SavemoneyDependencies = { ...azure, loadConfig },
): Command {
  const analyze = new Command("analyze")
    .description("Analyze Azure subscriptions and report cost opportunities")
    .option(
      "-c, --config <path>",
      "Path to YAML configuration file",
      parseNonEmptyString,
    )
    .option(
      "--subscriptionIds <ids...>",
      "Azure subscription IDs (overrides config and ARM_SUBSCRIPTION_ID)",
    )
    .addOption(
      new Option("-f, --format <format>", "Report format")
        .choices(reportFormats)
        .default("table"),
    )
    .option(
      "-l, --location <location>",
      "Preferred Azure location (overrides config)",
      parseNonEmptyString,
    )
    .option(
      "-d, --days <days>",
      "Metric analysis period in days (overrides config)",
      parsePositiveInteger,
    )
    .option(
      "-t, --tags <tags...>",
      "Filter resources by tags (key=value; space-separated). Advisor subscription-level findings remain global.",
    )
    .addOption(
      new Option(
        "-s, --source <source>",
        "Finding source: advisor, custom, or all (overrides config)",
      ).choices(sources),
    )
    .option("--no-pricing", "Disable Retail Prices API cost estimates")
    .option(
      "--azqr-report <path>",
      "Merge findings from an AZQR JSON report",
      parseNonEmptyString,
    )
    .option("-v, --verbose", "Show debug logs", false)
    .action(async function (options: AnalyzeOptions) {
      try {
        const subscriptionIds = parseSubscriptionIds(options.subscriptionIds);
        const filterTags = parseTagsOption(options.tags);
        const config: AzureConfig = await dependencies.loadConfig(
          options.config,
          { interactive: process.stdin.isTTY === true, subscriptionIds },
        );
        const finalConfig: AzureConfig = {
          ...config,
          ...(options.azqrReport ? { azqrReportPath: options.azqrReport } : {}),
          ...(filterTags.size ? { filterTags } : {}),
          ...(options.location ? { preferredLocation: options.location } : {}),
          ...(options.pricing === false ? { pricing: { enabled: false } } : {}),
          ...(options.source
            ? {
                sources:
                  options.source === "all"
                    ? [...AZURE_SOURCE_VALUES]
                    : [options.source],
              }
            : {}),
          ...(options.days ? { timespanDays: options.days } : {}),
          verbose: options.verbose,
        };
        const reports = await oraPromise(
          dependencies.analyzeAzureResources(finalConfig),
          {
            failText: "Analysis failed",
            stream: process.stderr,
            successText: "Analysis complete",
            text: "Analyzing Azure resources",
          },
        );
        await dependencies.generateReport(reports, options.format);
      } catch (error) {
        console.error(
          `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exitCode = 1;
      }
    });

  return new Command("savemoney")
    .description("Analyze cloud resources for cost optimization opportunities")
    .version(version)
    .addCommand(analyze);
}

export function parsePositiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new InvalidArgumentError("Must be a positive whole number");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError("Must be a safe positive whole number");
  }
  return parsed;
}

async function configureLogging(verbose: boolean): Promise<void> {
  await configure({
    loggers: [
      {
        category: ["savemoney"],
        lowestLevel: verbose ? "debug" : "info",
        sinks: ["stderr"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["stderr"],
      },
    ],
    sinks: {
      stderr: getConsoleSink({ console: new Console(process.stderr) }),
    },
  });
}

function parseNonEmptyString(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new InvalidArgumentError("Value cannot be empty");
  }
  return normalized;
}

function parseSubscriptionIds(ids?: string[]): string[] | undefined {
  if (!ids) return undefined;
  const normalizedIds = ids.map((id) => id.trim());
  if (normalizedIds.some((id) => id.length === 0)) {
    throw new InvalidArgumentError("Subscription IDs cannot be empty");
  }
  return normalizedIds;
}

function parseTagsOption(tags?: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (const pair of tags ?? []) {
    const separator = pair.indexOf("=");
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (separator <= 0 || key.length === 0) {
      throw new InvalidArgumentError(`Invalid tag "${pair}". Use key=value.`);
    }
    parsed.set(key, value);
  }
  return parsed;
}

const packageVersionSchema = z.object({ version: z.string() });
const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;

if (isMain) {
  void (async () => {
    const version = packageVersionSchema.parse(
      JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ),
    ).version;
    await configureLogging(
      process.argv.includes("--verbose") || process.argv.includes("-v"),
    );
    await makeSavemoneyCli(version).parseAsync();
  })().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
