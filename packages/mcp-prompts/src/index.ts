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
import { getLogger } from "@logtape/logtape";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogEntry } from "./types.js";

import { loadMarkdownPromptsAsCatalog } from "./utils/markdown-loader.js";

/**
 * Gets all prompts from Markdown sources with version injection.
 *
 * @returns Promise<CatalogEntry[]> - Array of all available prompts
 */
export const getPrompts = async (): Promise<CatalogEntry[]> => {
  const logger = getLogger("mcp-prompts");
  logger.debug("Loading prompts catalog...");

  // Get package version for injection
  const packageJson = await import("../package.json", {
    with: { type: "json" },
  });
  const version = packageJson.default.version;

  // Resolve the prompts directory (defaults to src/prompts)
  const dirname = fileURLToPath(new URL(".", import.meta.url));
  const promptDir = path.join(dirname, "..", "prompts");
  console.log("Prompts directory resolved to:", promptDir);

  let markdownPrompts: CatalogEntry[] = [];

  try {
    await fs.access(promptDir);
    markdownPrompts = (await loadMarkdownPromptsAsCatalog(promptDir)).map(
      (prompt) => ({
        ...prompt,
        version,
      }),
    );
    logger.debug(`Loaded ${markdownPrompts.length} Markdown prompts`);
  } catch (error) {
    logger.error(`Failed to load Markdown prompts from ${promptDir}`, {
      error,
    });
    throw error;
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
  const logger = getLogger("mcp-prompts");
  const prompts = await getPrompts();
  const enabledPrompts = prompts.filter((p) => p.enabled);

  logger.info(
    `Returning ${enabledPrompts.length} enabled prompts out of ${prompts.length} total`,
  );

  return enabledPrompts;
};

getPrompts().then((prompts) => {
  console.log(`MCP Prompts package initialized with ${prompts.length} prompts`);
});
