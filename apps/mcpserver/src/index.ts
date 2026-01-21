/**
 * PagoPA DX Knowledge Retrieval MCP Server
 *
 * This module exposes the main server startup logic without triggering side effects
 * at import time. All runtime setup flows from the main entrypoint.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import crypto from "node:crypto";
import * as http from "node:http";
import { z } from "zod";

import packageJson from "../package.json" with { type: "json" };
import { type AppConfig, loadConfig } from "./config.js";
import { createBedrockRuntimeClient } from "./config/aws.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { withPromptLogging } from "./decorators/prompt-usage-monitoring.js";
import { withToolLogging } from "./decorators/tool-usage-monitoring.js";
import { retrieveAndGenerate } from "./services/bedrock-retrieve-and-generate.js";
import { resolveToWebsiteUrl } from "./services/bedrock.js";
import { sessionStorage } from "./session.js";
import { createToolDefinitions, type ToolEntry } from "./tools/registry.js";
import { GetPromptResultType, ToolCallResult } from "./types.js";

type CreateServerParams = {
  enabledPrompts: Awaited<ReturnType<typeof getEnabledPrompts>>;
  requestId?: string;
  toolDefinitions: ToolEntry[];
};

export async function main(
  env: NodeJS.ProcessEnv,
): Promise<http.Server | undefined> {
  const config = loadConfig(env);

  await configureLogging(config.logLevel);
  configureAzureMonitoring(config.monitoring);

  const enabledPrompts = await getEnabledPrompts();

  const httpServer = await startHttpServer(config, enabledPrompts);
  return httpServer;
}

function createServer({
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

    const argsSchema = z.object(argsSchemaShape);

    mcpServer.registerPrompt(
      catalogEntry.prompt.name,
      {
        argsSchema: argsSchema.shape,
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

async function handleAskEndpoint(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  kbRuntimeClient: BedrockAgentRuntimeClient,
  logger: ReturnType<typeof getLogger>,
): Promise<void> {
  logger.info("Handling /ask endpoint");
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const jsonBody = JSON.parse(body);
    const query = jsonBody.query;

    if (!query || typeof query !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required field: query" }));
      return;
    }

    const response = await retrieveAndGenerate(
      config.aws.knowledgeBaseId,
      config.aws.modelArn,
      query,
      kbRuntimeClient,
    );

    // Extract unique source URLs from citations
    const sourceUrls = new Set<string>();
    response.citations?.forEach((citation) => {
      citation.retrievedReferences?.forEach((ref) => {
        const webLocation = resolveToWebsiteUrl(ref.location);
        if (webLocation?.webLocation?.url) {
          sourceUrls.add(webLocation.webLocation.url);
        }
      });
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        answer: response.output?.text || "",
        sources: Array.from(sourceUrls),
      }),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling /ask request: ${errorMessage}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }
}

async function startHttpServer(
  config: AppConfig,
  enabledPrompts: Awaited<ReturnType<typeof getEnabledPrompts>>,
): Promise<http.Server> {
  const logger = getLogger(["mcpserver"]);
  const awsLogger = getLogger(["mcpserver", "aws-config"]);
  const kbRuntimeClient = createBedrockRuntimeClient(
    config.aws.region,
    awsLogger,
  );
  const toolDefinitions = createToolDefinitions({
    aws: config.aws,
    githubSearchOrg: config.github.searchOrg,
    kbRuntimeClient,
  });

  const httpServer = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Log incoming request for debugging
      logger.debug("Incoming request", {
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      // Configure CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // Handle OPTIONS for CORS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // Handle /ask endpoint for Bedrock Knowledge Base queries
      if (req.url?.includes("/ask") && req.method === "POST") {
        await handleAskEndpoint(req, res, config, kbRuntimeClient, logger);
        return;
      }

      // Only allow POST and DELETE for MCP endpoints
      if (req.method !== "POST" && req.method !== "DELETE") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      try {
        // Parse request body
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }
        let jsonBody: unknown;
        try {
          jsonBody = body ? JSON.parse(body) : undefined;
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        // Create session for AsyncLocalStorage context (stateless per-request)
        // Extract request ID from AWS Lambda trace (undefined if not in AWS)
        const traceHeader = req.headers["x-amzn-trace-id"];
        const requestId =
          typeof traceHeader === "string"
            ? traceHeader.split(";")[0].replace("Root=", "")
            : undefined;

        const session = {
          id: crypto.randomUUID(),
          requestId,
        };

        // Execute request in isolated session context
        await sessionStorage.run(session, async () => {
          // Create new server and transport for this request
          // This ensures complete isolation between concurrent requests
          const server = createServer({
            enabledPrompts,
            requestId,
            toolDefinitions,
          });
          const transport = new StreamableHTTPServerTransport({
            // This MCP server is stateless at the transport layer: each HTTP request
            // runs in its own AsyncLocalStorage-backed session context via
            // `sessionStorage.run(...)`. Because we do not multiplex logical sessions
            // over a shared connection, transport-level session IDs are unnecessary,
            // so `sessionIdGenerator` is explicitly set to `undefined`.
            sessionIdGenerator: undefined,
          });

          await server.connect(transport);
          await transport.handleRequest(req, res, jsonBody);

          // Clean up after response
          res.on("close", () => {
            transport.close();
            server.close();
          });
        });
      } catch (error) {
        logger.error("Error handling request", { error });
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
    },
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, () => {
      logger.info(`MCP Server started on port ${config.port}`);
      resolve();
    });
  });

  return httpServer;
}
