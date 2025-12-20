/**
 * Configuration loader.
 * Loads and validates YAML configuration files.
 */

import * as fs from "fs";
import * as yaml from "js-yaml";

import { ConfigError, FileError } from "../errors/index.js";
import { type Config, ConfigSchema } from "./config.schema.js";

/**
 * Load and validate configuration from YAML file or stdin.
 */
export function loadConfig(configPath: string): Config {
  let content: string;

  try {
    if (configPath === "-") {
      // Read from stdin
      content = fs.readFileSync(0, "utf-8");
    } else {
      // Read from file
      content = fs.readFileSync(configPath, "utf-8");
    }
  } catch (error) {
    throw new FileError(
      `Failed to read config file: ${configPath} - ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  try {
    // Parse YAML
    const rawConfig = yaml.load(content) as unknown;

    // Validate with Zod schema
    const config = ConfigSchema.parse(rawConfig);

    return config;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "YAMLException"
    ) {
      throw new ConfigError(`Invalid YAML syntax: ${(error as Error).message}`);
    }
    throw new ConfigError(
      `Invalid configuration: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
