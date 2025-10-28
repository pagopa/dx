/**
 * MCP Prompts Package - Main Entry Point
 *
 * This package provides a catalog system for Model Context Protocol (MCP) prompts.
 * It loads and validates prompt definitions from Markdown files with frontmatter.
 *
 * Key features:
 * - Category-based filtering
 * - Enable/disable functionality
 * - Version injection from package.json
 * - Markdown format with Zod validation
 * - Flexible directory configuration
 */

export * from "./schemas.js";
export * from "./types.js";
export * from "./utils/markdown-loader.js";

import { existsSync } from "node:fs";

import type { CatalogEntry } from "./types.js";

import { logger } from "./utils/logger.js";
import {
  loadMarkdownPromptsAsCatalog,
  resolvePromptsDirectory,
} from "./utils/markdown-loader.js";

/**
 * Gets all prompts from Markdown sources with version injection.
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

  // Resolve the prompts directory (defaults to src/prompts)
  const markdownDir = resolvePromptsDirectory();
  let markdownPrompts: CatalogEntry[] = [];

  if (existsSync(markdownDir)) {
    try {
      markdownPrompts = await loadMarkdownPromptsAsCatalog(markdownDir);
      markdownPrompts = markdownPrompts.map((prompt) => ({
        ...prompt,
        version,
      }));
      logger.debug(`Loaded ${markdownPrompts.length} Markdown prompts`);
    } catch (error) {
      logger.error(`Failed to load Markdown prompts from ${markdownDir}`, {
        error,
      });
      throw error;
    }
  } else {
    logger.error(`Markdown prompts directory does not exist: ${markdownDir}`);
    throw new Error(`Prompts directory not found: ${markdownDir}`);
  }

  logger.info(
    `Final catalog: ${markdownPrompts.length} prompts (version: ${version})`,
  );

  return markdownPrompts;
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
