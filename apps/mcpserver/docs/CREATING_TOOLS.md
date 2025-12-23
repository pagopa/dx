# Creating MCP Tools

This guide explains how to create new tools for the MCP server using the `ITool` interface.

## Tool Structure

All tools must implement the `ITool` interface from `src/types/ITool.ts`:

```typescript
export interface ITool {
  /** Tool definition (name, description, schema, title) */
  readonly definition: ToolDefinition;

  /** Tool handler function */
  handler: ToolHandler;
}
```

## Step-by-Step Guide

### 1. Create a Tool Class

Create a new file in `src/tools/` (e.g., `MyCustomTool.ts`):

```typescript
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { withToolLogging } from "../decorators/toolUsageMonitoring.js";
import type { ITool, ToolDefinition, ToolHandler } from "../types/ITool.js";

/**
 * Tool name constant
 */
export const MY_CUSTOM_TOOL_NAME = "MyCustomTool";

/**
 * Input schema for the tool (using Zod)
 */
export const MyCustomToolInputSchema = z.object({
  input: z.string().describe("Your input parameter description"),
  // Add more parameters as needed
});

export type MyCustomToolInput = z.infer<typeof MyCustomToolInputSchema>;

/**
 * Tool class implementing ITool interface
 */
export class MyCustomTool implements ITool {
  public readonly definition: ToolDefinition = {
    name: MY_CUSTOM_TOOL_NAME,
    description: "Description of what your tool does",
    title: "My Custom Tool",
    inputSchema: MyCustomToolInputSchema,
  };

  /**
   * Handler with automatic logging and telemetry
   */
  public handler: ToolHandler = withToolLogging(
    MY_CUSTOM_TOOL_NAME,
    async (args: Record<string, unknown>): Promise<CallToolResult> => {
      // Validate input using Zod schema
      const validated = MyCustomToolInputSchema.parse(args);

      // Your tool logic here
      const result = await yourCustomLogic(validated);

      // Return result in MCP format
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    },
  );
}

async function yourCustomLogic(input: MyCustomToolInput): Promise<string> {
  // Implement your tool logic
  return `Processed: ${input.input}`;
}
```

### 2. Register the Tool

Add your tool to `src/utils/registerTools.ts`:

```typescript
import { MyCustomTool } from "../tools/MyCustomTool.js";

export function registerTools(server: McpServer): void {
  // ... existing tools

  // Register MyCustomTool
  const myCustomTool = new MyCustomTool();
  logger.debug(`Registering tool: ${myCustomTool.definition.name}`);
  server.registerTool(
    myCustomTool.definition.name,
    {
      description: myCustomTool.definition.description,
      inputSchema: myCustomTool.definition.inputSchema,
      title: myCustomTool.definition.title,
    },
    myCustomTool.handler,
  );
  logger.debug(`Registered tool: ${myCustomTool.definition.name}`);
}
```

### 3. Tools with Authentication

If your tool requires authentication (e.g., GitHub token):

```typescript
export class MyAuthenticatedTool implements ITool {
  public readonly definition: ToolDefinition = {
    name: "MyAuthenticatedTool",
    description: "Tool requiring authentication",
    title: "My Authenticated Tool",
    inputSchema: MyAuthenticatedToolInputSchema,
  };

  public handler: ToolHandler = withToolLogging(
    "MyAuthenticatedTool",
    async (
      args: Record<string, unknown>,
      sessionData?: Record<string, unknown>,
    ): Promise<CallToolResult> => {
      // Type guard for AuthInfo
      const authInfo = sessionData as AuthInfo | undefined;

      if (!authInfo || !authInfo.token) {
        throw new Error("Authentication token not available");
      }

      const validated = MyAuthenticatedToolInputSchema.parse(args);
      // Use authInfo.token for authenticated requests
      const result = await authenticatedRequest(authInfo.token, validated);

      return {
        content: [{ type: "text", text: result }],
      };
    },
  );
}
```

Register it with auth info:

```typescript
server.registerTool(
  myAuthTool.definition.name,
  {
    description: myAuthTool.definition.description,
    inputSchema: myAuthTool.definition.inputSchema,
    title: myAuthTool.definition.title,
  },
  async (
    args: Record<string, unknown>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) =>
    // Pass authInfo as sessionData to the handler
    myAuthTool.handler(
      args,
      extra.authInfo as Record<string, unknown> | undefined,
    ),
);
```

## Best Practices

1. **Use Zod for validation**: Always define a Zod schema for your input parameters
2. **Export constants**: Export tool names as constants for consistency
3. **Use withToolLogging**: Wrap your handler with `withToolLogging` for automatic telemetry
4. **Type your inputs**: Define and export a type for your validated inputs
5. **Document thoroughly**: Add JSDoc comments explaining what your tool does
6. **Error handling**: Throw descriptive errors that will be returned to the client
7. **Strong typing**: Avoid `any` types; use proper type guards when needed

## Testing

Create tests in `src/tools/__tests__/MyCustomTool.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { MyCustomTool, MyCustomToolInputSchema } from "../MyCustomTool.js";

describe("MyCustomTool", () => {
  it("should validate correct input", () => {
    const input = { input: "test" };
    expect(() => MyCustomToolInputSchema.parse(input)).not.toThrow();
  });

  it("should reject invalid input", () => {
    const input = { invalid: "test" };
    expect(() => MyCustomToolInputSchema.parse(input)).toThrow();
  });

  it("should process input correctly", async () => {
    const tool = new MyCustomTool();
    const result = await tool.handler({ input: "test" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
  });
});
```

## Examples

See existing tools for reference:

- `src/tools/QueryPagoPADXDocumentation.ts` - Simple tool without authentication
- `src/tools/SearchGitHubCode.ts` - Tool with OAuth authentication
