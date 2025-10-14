/**
 * MCP Prompts Package - Main Entry Point
 *
 * This package provides a catalog system for Model Context Protocol (MCP) prompts.
 * It handles dynamic loading, caching, and filtering of prompt definitions.
 *
 * Key features:
 * - Lazy loading with in-memory caching
 * - Category-based filtering
 * - Enable/disable functionality
 * - Version injection from package.json
 */

export * from "./types.js";
import type { CatalogEntry } from "./types.js";

import { loadPrompts } from "./prompts/loader.js";

// In-memory cache to avoid re-scanning the filesystem on every request
// This is critical for performance in serverless environments
let _prompts: CatalogEntry[] | null = null;

/**
 * Gets all prompts with lazy loading and caching.
 * First call scans the filesystem, subsequent calls return cached results.
 *
 * @returns Promise<CatalogEntry[]> - Array of all available prompts
 */
const getPrompts = async (): Promise<CatalogEntry[]> => {
  if (_prompts === null) {
    _prompts = await loadPrompts();
  }
  return _prompts;
};

/**
 * Legacy object that throws an error to guide users to the correct async API.
 * This prevents synchronous access to what should be an async operation.
 */
export const promptsCatalog = {
  get prompts() {
    throw new Error("Use getPrompts() instead of promptsCatalog.prompts");
  },
};

/**
 * Gets only the enabled prompts, returning just the PromptDefinition objects.
 * This is typically used by MCP servers to register available prompts.
 *
 * @returns Promise<PromptDefinition[]> - Array of enabled prompt definitions
 */
export const getEnabledPrompts = async () => {
  const prompts = await getPrompts();
  const enabled = [];
  for (const p of prompts) {
    if (p.enabled) enabled.push(p.prompt);
  }
  return enabled;
};

/**
 * Finds a specific prompt by its unique identifier.
 *
 * @param id - The unique prompt identifier to search for
 * @returns Promise<CatalogEntry | undefined> - The matching prompt or undefined if not found
 */
export const getPromptById = async (id: string) => {
  const prompts = await getPrompts();
  for (const p of prompts) {
    if (p.id === id) return p;
  }
  return undefined;
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
  const filtered = [];
  for (const p of prompts) {
    if (p.category === category && p.enabled) filtered.push(p);
  }
  return filtered;
};

export { getPrompts };

/**
 * Clears the internal cache, forcing a reload on next access.
 * Used primarily for testing to ensure clean state between test runs.
 */
export const _resetCache = () => {
  _prompts = null;
};
