/**
 * Type definitions for the MCP server
 */
import type { z } from "zod";

import type { Session } from "./session.js";

/**
 * Catalog entry for a prompt from the prompts package
 */
export type CatalogEntry = {
  id: string;
  prompt: {
    arguments: PromptArgument[];
    description: string;
    name: string;
  };
};

/**
 * Decorated prompt with load function
 */
export type DecoratedPrompt = {
  load: (args: Record<string, unknown>) => Promise<string>;
};

/**
 * Argument definition for a prompt
 */
export type PromptArgument = {
  description: string;
  name: string;
  required: boolean;
};

/**
 * Entry in the prompt registry combining catalog metadata and decorated prompt
 */
export type PromptEntry = {
  catalogEntry: CatalogEntry;
  prompt: DecoratedPrompt;
};

/**
 * Context passed to tool execution functions
 */
export type ToolContext = {
  session?: Session;
};

/**
 * Definition of a tool with its metadata and execution logic
 */
export type ToolDefinition = {
  annotations?: {
    title: string;
  };
  description: string;
  execute: (args: unknown, context?: ToolContext) => Promise<string>;
  name: string;
  parameters: z.ZodType;
};
