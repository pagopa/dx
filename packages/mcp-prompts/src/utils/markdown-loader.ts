/**
 * Markdown prompt loader utilities.
 *
 * This module provides functionality to load and parse Markdown files with
 * frontmatter as MCP prompts, with validation using Zod schemas.
 */

import { getLogger } from "@logtape/logtape";
import matter from "gray-matter";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { CatalogEntry } from "../types.js";

import {
  MarkdownPromptFrontmatterSchema as markdownPromptFrontmatterSchema,
  type ParsedMarkdownPrompt,
  ParsedMarkdownPromptSchema as parsedMarkdownPromptSchema,
} from "../schemas.js";

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
  path.extname(filename).toLowerCase() === ".md";

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
      load: createPromptLoader(content, frontmatter.arguments),
      name: frontmatter.id,
    },
    tags: frontmatter.tags,
  };
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
  const logger = getLogger("mcp-prompts");
  try {
    // Read all files in the prompts directory
    const files = await fs.readdir(promptsDir);
    const markdownFiles = files.filter(isMarkdownFile);

    logger.debug(
      `Found ${markdownFiles.length} markdown files in ${promptsDir}`,
    );

    // Process all markdown files concurrently
    const parseResults = await Promise.allSettled(
      markdownFiles.map(async (file) => {
        const filepath = path.join(promptsDir, file);
        let parsedPrompt: ParsedMarkdownPrompt;
        try {
          parsedPrompt = await parseMarkdownPrompt(filepath);
        } catch (error) {
          logger.error(`Error parsing markdown prompt at ${filepath}`, {
            error,
          });
          throw error;
        }
        logger.warn(
          `Successfully parsed prompt: ${parsedPrompt.frontmatter.id}`,
        );
        return parsedPrompt;
      }),
    );

    // Extract successful results
    const parsedPrompts = parseResults
      .filter((p) => p.status === "fulfilled")
      .map((result) => result.value);

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
    const fileContent = await fs.readFile(filepath, "utf-8");

    // Parse frontmatter and content using gray-matter
    const { content, data } = matter(fileContent);

    // Validate frontmatter using Zod schema
    const frontmatter = markdownPromptFrontmatterSchema.parse(data);

    // Create the parsed prompt object
    const parsedPrompt = {
      content: content.trim(),
      filepath,
      frontmatter,
    };

    // Validate the complete parsed prompt
    return parsedMarkdownPromptSchema.parse(parsedPrompt);
  } catch (error) {
    throw new Error(
      `Failed to parse markdown prompt ${filepath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Creates a prompt loader function that processes template placeholders.
 *
 * @param content - The raw markdown content with template placeholders
 * @param arguments_ - The argument definitions from frontmatter
 * @returns Async function that loads and processes the prompt with provided arguments
 */
function createPromptLoader(
  content: string,
  arguments_: ParsedMarkdownPrompt["frontmatter"]["arguments"],
) {
  return async (args: Record<string, unknown>) => {
    // Replace placeholders in content with actual argument values
    const processedWithArgs = Object.entries(args).reduce(
      (currentContent, [key, value]) =>
        createTemplateReplacer(key, value)(currentContent),
      content,
    );

    // Replace any remaining unreplaced templates with default values
    const remainingTemplates =
      processedWithArgs.match(/\{\{\s*([^}]+)\s*\}\}/g) ?? [];

    const defaultReplacer = createDefaultReplacer(arguments_);

    return remainingTemplates.reduce(
      (currentContent, template) => defaultReplacer(currentContent, template),
      processedWithArgs,
    );
  };
}
