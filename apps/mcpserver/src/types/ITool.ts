import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/**
 * Interface for MCP tools
 * All tools must implement this interface to ensure consistent structure
 *
 * @example
 * ```typescript
 * export class MyCustomTool implements ITool {
 *   public readonly definition: ToolDefinition = {
 *     name: "MyCustomTool",
 *     description: "Does something useful",
 *     title: "My Custom Tool",
 *     inputSchema: z.object({
 *       input: z.string().describe("Input parameter")
 *     })
 *   };
 *
 *   public handler: ToolHandler = withToolLogging(
 *     this.definition.name,
 *     async (args) => {
 *       const validated = this.definition.inputSchema.parse(args);
 *       // Tool logic here
 *       return {
 *         content: [{ type: "text", text: "Result" }]
 *       };
 *     }
 *   );
 * }
 * ```
 */
export type ITool = {
  /** Tool definition (name, description, schema, title) */
  readonly definition: ToolDefinition;

  /** Tool handler function */
  handler: ToolHandler;
};

/**
 * Tool definition interface
 */
export type ToolDefinition = {
  /** Human-readable description of what the tool does */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodTypeAny;
  /** Tool name (unique identifier) */
  name: string;
  /** Human-readable title */
  title: string;
};

/**
 * Tool handler function signature
 * @param args - The input arguments (validated by inputSchema)
 * @param sessionData - Optional session data (e.g., auth info)
 * @returns Promise resolving to CallToolResult
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  sessionData?: Record<string, unknown>,
) => Promise<CallToolResult>;

/**
 * Type guard to check if an object implements ITool
 */
export function isITool(obj: unknown): obj is ITool {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "definition" in obj &&
    "handler" in obj &&
    typeof (obj as ITool).definition === "object" &&
    typeof (obj as ITool).handler === "function"
  );
}
