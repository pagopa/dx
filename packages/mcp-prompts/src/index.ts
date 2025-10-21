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
export { setLogger } from "./utils/logger.js";
import type { CatalogEntry } from "./types.js";

import { prompts as allPrompts } from "./prompts/index.js";

/**
 * Gets all prompts with version injection.
 *
 * @returns Promise<CatalogEntry[]> - Array of all available prompts
 */
const getPrompts = async (): Promise<CatalogEntry[]> => {
  // Get package version for injection
  const packageJson = await import("../package.json", {
    with: { type: "json" },
  });
  const version = packageJson.default.version;

  // Inject version into all prompts
  return allPrompts.map((prompt) => ({ ...prompt, version }));
};

/**
 * Gets only the enabled prompts, returning the full CatalogEntry objects.
 * This is typically used by MCP servers to register available prompts.
 *
 * @returns Promise<CatalogEntry[]> - Array of enabled catalog entries
 */
export const getEnabledPrompts = async (): Promise<CatalogEntry[]> => {
  const prompts = await getPrompts();
  return prompts.filter((p) => p.enabled);
};

/**
 * Finds a specific prompt by its unique identifier.
 *
 * @param id - The unique prompt identifier to search for
 * @returns Promise<CatalogEntry | undefined> - The matching prompt or undefined if not found
 */
export const getPromptById = async (id: string) => {
  const prompts = await getPrompts();
  const promptsById = new Map(prompts.map((p) => [p.id, p]));
  return promptsById.get(id);
};

/**
 * Filters prompts by category, returning only enabled ones.
 * Useful for organizing prompts by domain (e.g., "terraform", "azure").
 *
 * @param category - The category to filter by
 * @returns Promise<CatalogEntry[]> - Array of enabled prompts in the specified category
 */
export const getPromptsByCategory = async (category: string) => {
  const prompts = await getPrompts();
  return prompts.filter((p) => p.category === category && p.enabled);
};

export { getPrompts };
