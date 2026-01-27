import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import { z } from "zod";

import type { ToolEntry } from "../tools/registry.js";
import type { GetPromptResultType, ToolCallResult } from "../types.js";

import packageJson from "../../package.json" with { type: "json" };
import { withPromptLogging } from "../decorators/prompt-usage-monitoring.js";
import { withToolLogging } from "../decorators/tool-usage-monitoring.js";
import { sessionStorage } from "../session.js";

export type CreateServerParams = {
  enabledPrompts: Awaited<ReturnType<typeof getEnabledPrompts>>;
  requestId?: string;
  toolDefinitions: ToolEntry[];
};

export function createServer({
  enabledPrompts,
  requestId,
  toolDefinitions,
}: CreateServerParams): McpServer {
  const logger = getLogger(["mcpserver"]);
  const mcpServer = new McpServer({
    name: "pagopa-dx-mcp-server",
    version: packageJson.version,
  });

  /**
   * Register tools dynamically from the tool registry.
   * This pattern allows tools to be added/removed by simply updating the registry,
   * without needing to modify this registration code.
   */
  toolDefinitions.forEach(({ id, requiresSession, tool: toolDef }) => {
    const decoratedTool = withToolLogging(toolDef);
    const { annotations } = decoratedTool;

    // Ensure parameters is a ZodObject (all tools must use z.object())
    if (!(decoratedTool.parameters instanceof z.ZodObject)) {
      throw new Error(`Tool "${id}" must use z.object() for parameters schema`);
    }
    const zodObject = decoratedTool.parameters;

    mcpServer.registerTool(
      id,
      {
        annotations: {
          destructiveHint: annotations.destructiveHint ?? false,
          idempotentHint: annotations.idempotentHint ?? true,
          openWorldHint: annotations.openWorldHint ?? true,
          readOnlyHint: annotations.readOnlyHint ?? true,
        },
        description: decoratedTool.description,
        inputSchema: zodObject.shape,
        title: annotations.title,
      },
      async (args: Record<string, unknown>): Promise<ToolCallResult> => {
        const store = sessionStorage.getStore();
        const context = requiresSession
          ? {
              requestId: store?.requestId,
              session: store,
            }
          : undefined;
        const result = await decoratedTool.execute(args, context);
        return {
          content: [
            {
              text:
                typeof result === "string" ? result : JSON.stringify(result),
              type: "text",
            },
          ],
        };
      },
    );
  });

  // Register prompts using the modern registerPrompt pattern
  enabledPrompts.forEach((catalogEntry) => {
    const decoratedPrompt = withPromptLogging(
      catalogEntry.prompt,
      catalogEntry.id,
      requestId,
    );

    // Build Zod schema from prompt arguments
    const argsSchemaShape: Record<
      string,
      | z.ZodOptional<z.ZodType<string, z.ZodTypeDef, string>>
      | z.ZodType<string, z.ZodTypeDef, string>
    > = {};
    for (const arg of catalogEntry.prompt.arguments) {
      const fieldSchema = z.string().describe(arg.description);
      argsSchemaShape[arg.name] = arg.required
        ? fieldSchema
        : fieldSchema.optional();
    }

    const zodObject = z.object(argsSchemaShape);

    mcpServer.registerPrompt(
      catalogEntry.prompt.name,
      {
        argsSchema: zodObject.shape,
        description: catalogEntry.prompt.description,
      },
      async (args: Record<string, unknown>): Promise<GetPromptResultType> => {
        const content = await decoratedPrompt.load(args || {});
        return {
          messages: [
            {
              content: {
                text: content,
                type: "text",
              },
              role: "user",
            },
          ],
        };
      },
    );
  });

  logger.debug(
    `Server initialized with ${toolDefinitions.length} tools and ${enabledPrompts.length} prompts`,
  );

  return mcpServer;
}
