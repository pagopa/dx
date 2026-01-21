/**
 * Type definitions for the MCP server
 */
import type { CatalogEntry as PromptCatalogEntry } from "@pagopa/dx-mcpprompts";
import type { z } from "zod";

import type { Session } from "./session.js";

/**
 * Catalog entry for a prompt from the prompts package.
 * Re-exported from @pagopa/dx-mcpprompts to stay in sync with the source type.
 */
export type CatalogEntry = PromptCatalogEntry;

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
  /** AWS Lambda request ID for correlating logs across CloudWatch and Application Insights */
  requestId?: string;
  session?: Session;
};

/**
 * Definition of a tool with its metadata and execution logic.
 * Uses Record<string, unknown> as the base to allow flexibility in parameter types.
 * Individual tool implementations can have more specific parameter types.
 */
export type ToolDefinition = {
  annotations: {
    /** Whether this operation can delete or modify data destructively */
    destructiveHint?: boolean;
    /** Whether the operation produces same results for same inputs */
    idempotentHint?: boolean;
    /** Whether the tool can work with open-ended inputs */
    openWorldHint?: boolean;
    /** Whether this is a read-only operation */
    readOnlyHint?: boolean;
    /** Display title for the tool */
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
