/**
 * MCP Prompts Package - Main Entry Point
 *
 * This package provides a catalog system for Model Context Protocol (MCP) prompts.
 * It handles loading and filtering of prompt definitions.
 *
 * Key features:
 * - Category-based filtering
 * - Enable/disable functionality
 * - Version injection from package.json
 */

export * from "./types.js";
import type { CatalogEntry } from "./types.js";

import { prompts as allPrompts } from "./prompts/index.js";
import { logger } from "./utils/logger.js";

/**
 * Gets all prompts with version injection.
 *
 * @returns Promise<CatalogEntry[]> - Array of all available prompts
 */
export const getPrompts = async (): Promise<CatalogEntry[]> => {
  logger.debug("Loading prompts catalog...");

  // Get package version for injection
  const packageJson = await import("../package.json", {
    with: { type: "json" },
  });
  const version = packageJson.default.version;

  // Inject version into all prompts
  const prompts = allPrompts.map((prompt) => ({ ...prompt, version }));

  logger.debug(`Loaded ${prompts.length} prompts (version: ${version})`);

  return prompts;
};

/**
 * Gets only the enabled prompts, returning the full CatalogEntry objects.
 * This is typically used by MCP servers to register available prompts.
 *
 * @returns Promise<CatalogEntry[]> - Array of enabled catalog entries
 */
export const getEnabledPrompts = async (): Promise<CatalogEntry[]> => {
  const prompts = await getPrompts();
  const enabledPrompts = prompts.filter((p) => p.enabled);

  logger.info(
    `Returning ${enabledPrompts.length} enabled prompts out of ${prompts.length} total`,
  );

  return enabledPrompts;
};
