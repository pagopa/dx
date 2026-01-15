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
 * MCP Get Prompt Result
 */
export type GetPromptResultType = {
  messages: PromptMessage[];
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
 * MCP Prompt Message
 */
export type PromptMessage = {
  content: PromptMessageContent;
  role: "assistant" | "user";
};

/**
 * MCP Prompt Message Content
 */
export type PromptMessageContent = {
  text: string;
  type: "text";
};

/**
 * MCP Tool Call Result
 */
export type ToolCallResult = {
  content: ToolResultContent[];
};

/**
 * Context passed to tool execution functions
 */
export type ToolContext = {
  session?: Session;
};

/**
 * Definition of a tool with its metadata and execution logic.
 * Uses Record<string, unknown> as the base to allow flexibility in parameter types.
 * Individual tool implementations can have more specific parameter types.
 */
export type ToolDefinition = {
  annotations?: {
    title: string;
  };
  description: string;
  execute: (
    args: Record<string, unknown>,
    context?: ToolContext,
  ) => Promise<Record<string, unknown>> | Promise<string>;
  name: string;
  parameters: z.ZodType<unknown>;
};

/**
 * MCP Tool Result with text content
 */
export type ToolResultContent = {
  text: string;
  type: "text";
};
