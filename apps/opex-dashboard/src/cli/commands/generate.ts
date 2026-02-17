/**
 * Generate command implementation.
 * Generates operational dashboards from OpenAPI specifications.
 */

import { Command } from "commander";

import { type BuilderType, createBuilder } from "../../core/builder-factory.js";
import { loadConfig } from "../../core/config/index.js";
import { ConfigError } from "../../core/errors/index.js";
import { OA3Resolver } from "../../core/resolver/index.js";
import { ensureDirectory, writeToStdout } from "../helpers/output-writer.js";
import { cleanupTempFile, downloadSpec } from "../helpers/spec-downloader.js";

/**
 * Create generate command.
 */
export function createGenerateCommand(): Command {
  const command = new Command("generate");

  command
    .description("Generate a dashboard definition from OpenAPI specification")
    .requiredOption(
      "-t, --template-type <type>",
      "Type of template to generate",
      (value: string) => {
        if (!["azure-dashboard", "azure-dashboard-raw"].includes(value)) {
          throw new Error(
            "Invalid template type. Must be: azure-dashboard or azure-dashboard-raw",
          );
        }
        return value;
      },
    )
    .requiredOption(
      "-c, --config <path>",
      "Path to YAML configuration file (use - for stdin)",
    )
    .option(
      "--package [path]",
      "Save template as a package in specified directory (default: current directory)",
      false,
    )
    .action(generateHandler);

  return command;
}

/**
 * Generate command handler.
 */
async function generateHandler(options: {
  config: string;
  package?: string;
  templateType: BuilderType;
}): Promise<void> {
  try {
    // Load and validate configuration
    const config = await loadConfig(options.config);

    // Download spec if HTTP URL
    const isHttp = config.oa3_spec.startsWith("http");
    const tempFile = isHttp ? await downloadSpec(config.oa3_spec) : undefined;
    const specPath = tempFile ?? config.oa3_spec;

    // Validate resource type
    const allowedResourceTypes = ["app-gateway", "api-management"];
    if (!allowedResourceTypes.includes(config.resource_type)) {
      throw new ConfigError(
        `Invalid resource_type configuration: valid values are ${allowedResourceTypes.join(
          ", ",
        )}`,
      );
    }

    // Create resolver
    const resolver = new OA3Resolver(specPath);

    // Prepare builder parameters
    const builderParams = {
      action_groups_ids: config.action_groups,
      availability_threshold: config.availability_threshold,
      data_source_id: config.data_source,
      evaluation_frequency: config.evaluation_frequency,
      evaluation_time_window: config.evaluation_time_window,
      event_occurrences: config.event_occurrences,
      location: config.location,
      name: config.name,
      queries: config.queries || config.overrides?.queries,
      resolver,
      resource_group: config.resource_group,
      resource_type: config.resource_type,
      resources: [config.data_source],
      response_time_threshold: config.response_time_threshold,
      terraform: config.terraform,
      timespan: config.timespan,
    };

    // Create builder
    const builder = await createBuilder(options.templateType, builderParams);

    // Get overrides from config
    const overrides = config.overrides || {};

    // Output: package or stdout
    if (options.package) {
      const outputPath = options.package;
      await ensureDirectory(outputPath);
      await builder.package(outputPath, overrides);
    } else {
      const output = builder.produce(overrides);
      writeToStdout(output);
    }

    // Cleanup temp file if created
    if (tempFile) {
      await cleanupTempFile(tempFile);
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
