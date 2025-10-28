/**
 * Markdown prompt loader utilities.
 *
 * This module provides functionality to load and parse Markdown files with
 * frontmatter as MCP prompts, with validation using Zod schemas.
 */

import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { CatalogEntry } from "../types.js";

import {
  MarkdownPromptFrontmatterSchema,
  type ParsedMarkdownPrompt,
  ParsedMarkdownPromptSchema,
} from "../schemas.js";
import { logger } from "./logger.js";

// Functional utilities for template processing
const createTemplateReplacer =
  (key: string, value: unknown) =>
  (content: string): string => {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    return content.replace(placeholder, String(value ?? ""));
  };

const extractVariableName = (template: string): string =>
  template.replace(/\{\{\s*|\s*\}\}/g, "");

const isMarkdownFile = (filename: string): boolean =>
  extname(filename).toLowerCase() === ".md";

const isFulfilled = <T>(
  result: PromiseSettledResult<T>,
): result is PromiseFulfilledResult<T> => result.status === "fulfilled";

const isRejected = <T>(
  result: PromiseSettledResult<T>,
): result is PromiseRejectedResult => result.status === "rejected";

const createDefaultReplacer =
  (arguments_: ParsedMarkdownPrompt["frontmatter"]["arguments"]) =>
  (content: string, template: string): string => {
    const variableName = extractVariableName(template);
    const argDef = arguments_.find((arg) => arg.name === variableName);
    const placeholder = new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, "g");
    return content.replace(placeholder, argDef?.default ?? "");
  };

/**
 * Converts a ParsedMarkdownPrompt to a CatalogEntry for MCP compatibility.
 *
 * @param parsedPrompt - The parsed markdown prompt
 * @returns CatalogEntry - MCP-compatible catalog entry
 */
export function convertToMCPCatalogEntry(
  parsedPrompt: ParsedMarkdownPrompt,
): CatalogEntry {
  const { content, frontmatter } = parsedPrompt;

  return {
    category: frontmatter.category,
    enabled: frontmatter.enabled,
    id: frontmatter.id,
    metadata: {
      description: frontmatter.description,
      examples: frontmatter.examples,
      title: frontmatter.title,
    },
    prompt: {
      arguments: frontmatter.arguments.map((arg) => ({
        description: arg.description,
        name: arg.name,
        required: arg.required,
      })),
      description: frontmatter.description,
      load: async (args: Record<string, unknown>) => {
        // Replace placeholders in content with actual argument values
        const processedWithArgs = Object.entries(args).reduce(
          (currentContent, [key, value]) =>
            createTemplateReplacer(key, value)(currentContent),
          content,
        );

        // Replace any remaining unreplaced templates with default values
        const remainingTemplates =
          processedWithArgs.match(/\{\{\s*([^}]+)\s*\}\}/g) ?? [];

        const defaultReplacer = createDefaultReplacer(frontmatter.arguments);

        return remainingTemplates.reduce(
          (currentContent, template) =>
            defaultReplacer(currentContent, template),
          processedWithArgs,
        );
      },
      name: frontmatter.id,
    },
    tags: frontmatter.tags,
  };
}

/**
 * Gets the default prompts directory relative to this module.
 *
 * @deprecated Use resolvePromptsDirectory() instead for better flexibility
 * @returns string - Absolute path to the prompts directory
 */
export function getDefaultPromptsDirectory(): string {
  return resolvePromptsDirectory();
}

/**
 * Loads and parses all Markdown prompt files from a directory.
 *
 * @param promptsDir - Directory path containing .md files
 * @returns Promise<ParsedMarkdownPrompt[]> - Array of parsed and validated prompts
 */
export async function loadMarkdownPrompts(
  promptsDir: string,
): Promise<ParsedMarkdownPrompt[]> {
  try {
    // Read all files in the prompts directory
    const files = await readdir(promptsDir);
    const markdownFiles = files.filter(isMarkdownFile);

    logger.debug(
      `Found ${markdownFiles.length} markdown files in ${promptsDir}`,
    );

    // Process all markdown files concurrently
    const parseResults = await Promise.allSettled(
      markdownFiles.map(async (file) => {
        const filepath = join(promptsDir, file);
        const parsedPrompt = await parseMarkdownPrompt(filepath);
        logger.debug(
          `Successfully parsed prompt: ${parsedPrompt.frontmatter.id}`,
        );
        return parsedPrompt;
      }),
    );

    // Extract successful results and log failed ones
    const parsedPrompts = parseResults
      .filter(isFulfilled)
      .map((result) => result.value);

    // Log failed parses
    parseResults.filter(isRejected).forEach((result) => {
      logger.error("Failed to parse a markdown prompt", {
        reason: result.reason,
      });
    });

    logger.info(
      `Loaded ${parsedPrompts.length} markdown prompts from ${promptsDir}`,
    );
    return parsedPrompts;
  } catch (error) {
    logger.error(`Failed to load markdown prompts from ${promptsDir}`, {
      error,
    });
    throw error;
  }
}

/**
 * Loads all markdown prompts and converts them to MCP catalog entries.
 *
 * @param promptsDir - Directory path containing .md files
 * @returns Promise<CatalogEntry[]> - Array of MCP-compatible catalog entries
 */
export async function loadMarkdownPromptsAsCatalog(
  promptsDir: string,
): Promise<CatalogEntry[]> {
  const parsedPrompts = await loadMarkdownPrompts(promptsDir);
  return parsedPrompts.map(convertToMCPCatalogEntry);
}

/**
 * Parses a single Markdown file with frontmatter validation.
 *
 * @param filepath - Path to the markdown file
 * @returns Promise<ParsedMarkdownPrompt> - Parsed and validated prompt
 */
export async function parseMarkdownPrompt(
  filepath: string,
): Promise<ParsedMarkdownPrompt> {
  try {
    // Read the file content
    const fileContent = await readFile(filepath, "utf-8");

    // Parse frontmatter and content using gray-matter
    const { content, data } = matter(fileContent);

    // Validate frontmatter using Zod schema
    const frontmatter = MarkdownPromptFrontmatterSchema.parse(data);

    // Create the parsed prompt object
    const parsedPrompt = {
      content: content.trim(),
      filepath,
      frontmatter,
    };

    // Validate the complete parsed prompt
    return ParsedMarkdownPromptSchema.parse(parsedPrompt);
  } catch (error) {
    throw new Error(
      `Failed to parse markdown prompt ${filepath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Gets the prompts directory - always uses the default directory within the package.
 *
 * @returns string - Absolute path to the prompts directory (src/prompts)
 */
export function resolvePromptsDirectory(): string {
  // Use default directory within the package
  const currentFileUrl = import.meta.url;
  const currentDir = fileURLToPath(new URL(".", currentFileUrl));

  // Check if we're running from src/ (development) or dist/ (compiled)
  const pathSegments = currentDir.split(sep);
  const isSrcPath = pathSegments.includes("src");

  if (isSrcPath) {
    // Development: from src/utils/ -> ../prompts/
    return join(currentDir, "..", "prompts");
  } else {
    // Compiled: from dist/ -> ./prompts/ (copied by build to dist/prompts/)
    return join(currentDir, "prompts");
  }
}
