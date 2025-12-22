/**
 * Generate command implementation.
 * Generates operational dashboards from OpenAPI specifications.
 */

import { Command } from "commander";

import { type BuilderType, createBuilder } from "../../core/builder-factory.js";
import { loadConfig } from "../../core/config/index.js";
import { ConfigError } from "../../core/errors/index.js";
import { OA3Resolver } from "../../core/resolver/index.js";
import { mapConfigOverrides } from "../../utils/index.js";
import {
  ensureDirectory,
  getPackageOutputPath,
  writeToStdout,
} from "../helpers/output-writer.js";
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
  templateType: string;
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

    // Prepare builder parameters (map snake_case config to camelCase params)
    // Note: queries is already camelCase after Zod parsing
    const builderParams = {
      actionGroupsIds: config.action_groups,
      availabilityThreshold: config.availability_threshold,
      dataSourceId: config.data_source,
      evaluationFrequency: config.evaluation_frequency,
      evaluationTimeWindow: config.evaluation_time_window,
      eventOccurrences: config.event_occurrences,
      location: config.location,
      name: config.name,
      queries: config.queries || config.overrides?.queries,
      resolver,
      resources: [config.data_source],
      resourceType: config.resource_type,
      responseTimeThreshold: config.response_time_threshold,
      terraform: config.terraform,
      timespan: config.timespan,
    };

    // Create builder
    const builder = await createBuilder(
      options.templateType as BuilderType,
      builderParams,
    );

    // Map overrides from snake_case (YAML) to camelCase (internal)
    const mappedOverrides = config.overrides
      ? mapConfigOverrides(config.overrides)
      : {};

    // Output: package or stdout
    if (options.package) {
      const outputPath = getPackageOutputPath(options.package);
      await ensureDirectory(outputPath);
      await builder.package(outputPath, mappedOverrides);
    } else {
      const output = builder.produce(mappedOverrides);
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
