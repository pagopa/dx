/**
 * Configuration loader.
 * Loads and validates YAML configuration files.
 */

import { readFile } from "fs/promises";
import * as yaml from "js-yaml";

import { ConfigError, FileError } from "../errors/index.js";
import { type Config, ConfigSchema } from "./config.schema.js";

/**
 * Load and validate configuration from YAML file or stdin.
 */
export async function loadConfig(configPath: string): Promise<Config> {
  const content = await (async () => {
    try {
      if (configPath === "-") {
        // Read from stdin
        return await readStdin();
      }
      // Read from file
      return await readFile(configPath, "utf-8");
    } catch (error) {
      throw new FileError(
        `Failed to read config file: ${configPath} - ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  })();

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

/**
 * Read content from stdin.
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
