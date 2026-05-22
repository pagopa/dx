import type { AzureConfig, FindingSource } from "@pagopa/dx-savemoney";

import { azure, loadConfig } from "@pagopa/dx-savemoney";
import { Command, InvalidArgumentError } from "commander";

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
    .option(
      "-s, --source <source>",
      "Restrict findings to a single source: 'advisor', 'custom', or 'all' (default: all)",
      parseSourceOption,
      "all",
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
          sources:
            options.source === "all"
              ? (config.sources ?? ["advisor", "custom"])
              : [options.source as FindingSource],
          timespanDays:
            Number.parseInt(options.days, 10) || config.timespanDays,
          verbose: verbose ?? false,
        };

        // Run analysis with a TTY-only progress spinner so the CLI doesn't
        // look frozen during the (potentially several-minute) Azure round-trips.
        const stopSpinner = startSpinner("Analyzing Azure resources");
        let reports;
        try {
          reports = await azure.analyzeAzureResources(finalConfig);
        } finally {
          stopSpinner();
        }
        await azure.generateReport(reports, options.format);
      } catch (error) {
        exitWithError(this)(
          error instanceof Error
            ? new Error(`Analysis failed: ${error.message}`, { cause: error })
            : new Error(`Analysis failed: ${String(error)}`),
        );
      }
    });

/**
 * Parses the `--source` option, accepting `all`, `advisor`, or `custom`
 * and rejecting any other value with a Commander-friendly error so the
 * CLI prints the offending value and the allowed set.
 */
function parseSourceOption(value: string): string {
  const allowed = new Set(["advisor", "all", "custom"]);
  if (!allowed.has(value)) {
    throw new InvalidArgumentError(
      `Allowed values are: ${[...allowed].join(", ")}`,
    );
  }
  return value;
}

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

/**
 * Renders a minimal braille spinner on stderr while a long-running task
 * is in flight. Returns a `stop` function that clears the line and unrefs
 * the timer so the process can exit naturally.
 *
 * The spinner is a no-op when stderr is not a TTY (CI, piped output)
 * to avoid polluting logs with control characters.
 */
function startSpinner(label: string): () => void {
  if (!process.stderr.isTTY) {
    process.stderr.write(`${label}...\n`);
    return () => undefined;
  }
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const start = Date.now();
  const render = () => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    process.stderr.write(
      `\r${frames[i % frames.length]} ${label}... ${elapsed}s`,
    );
    i++;
  };
  render();
  const timer = setInterval(render, 100);
  timer.unref?.();
  return () => {
    clearInterval(timer);
    // Clear the spinner line so the report output starts cleanly.
    process.stderr.write("\r\x1b[2K");
  };
}
