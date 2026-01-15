#!/usr/bin/env node
/**
 * PagoPA DX Knowledge Retrieval MCP Server
 *
 * This server provides tools to interact with DX documentation and GitHub repositories.
 * It supports stateless operation via HTTP and manages session context for concurrent requests.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import * as http from "node:http";
import { z } from "zod";

import packageJson from "../package.json" with { type: "json" };
import { verifyGithubUser } from "./auth/github.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { withPromptLogging } from "./decorators/promptUsageMonitoring.js";
import { withToolLogging } from "./decorators/toolUsageMonitoring.js";
import { sessionStorage } from "./session.js";
import { toolDefinitions } from "./tools/registry.js";
import { GetPromptResultType, ToolCallResult } from "./types.js";

// Configure logging
await configureLogging();
await configureAzureMonitoring();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");

// Load enabled prompts for later registration
const enabledPrompts = await getEnabledPrompts();

/**
 * Creates a new MCP server instance with all tools and prompts registered.
 * This function is called for each request to ensure complete isolation
 * and thread-safety in concurrent scenarios (e.g., AWS Lambda warm starts).
 */
function createServer(): McpServer {
  const mcpServer = new McpServer({
    name: "pagopa-dx-mcp-server",
    version: packageJson.version,
  });

  /**
   * Register tools dynamically from the tool registry.
   * This pattern allows tools to be added/removed by simply updating the registry,
   * without needing to modify this registration code.
   */
  toolDefinitions.forEach(
    ({
      destructiveHint,
      id,
      idempotentHint,
      openWorldHint,
      readOnlyHint,
      requiresSession,
      tool: toolDef,
    }) => {
      const decoratedTool = withToolLogging(toolDef);

      mcpServer.registerTool(
        id,
        {
          annotations: {
            destructiveHint: destructiveHint ?? false,
            idempotentHint: idempotentHint ?? true,
            openWorldHint: openWorldHint ?? true,
            readOnlyHint: readOnlyHint ?? true,
          },
          description: decoratedTool.description,
          inputSchema:
            (
              decoratedTool.parameters as z.ZodObject<
                Record<string, z.ZodTypeAny>
              >
            ).shape || decoratedTool.parameters,
          title: decoratedTool.annotations?.title || toolDef.name || id,
        },
        async (args: Record<string, unknown>): Promise<ToolCallResult> => {
          const context = requiresSession
            ? { session: sessionStorage.getStore() }
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
    },
  );

  // Register prompts using the modern registerPrompt pattern
  enabledPrompts.forEach((catalogEntry) => {
    const decoratedPrompt = withPromptLogging(
      catalogEntry.prompt,
      catalogEntry.id,
    );

    // Build Zod schema from prompt arguments
    const argsSchemaShape: Record<string, z.ZodTypeAny> = {};
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

/**
 * HTTP server for stateless MCP operations
 *
 * Each request:
 * 1. Authenticates via GitHub PAT (x-gh-pat header)
 * 2. Creates a new transport for stateless operation
 * 3. Executes in AsyncLocalStorage context for request-scoped data
 * 4. Cleans up resources after completion
 */
const PORT = parseInt(process.env.PORT || "8080", 10);
const httpServer = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    // Configure CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-gh-pat");

    // Handle OPTIONS for CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only allow POST and DELETE
    if (req.method !== "POST" && req.method !== "DELETE") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      // GitHub authentication
      const authHeader = req.headers["x-gh-pat"];
      const apiKey =
        typeof authHeader === "string"
          ? authHeader
          : Array.isArray(authHeader)
            ? authHeader[0]
            : undefined;

      // SECURITY: Server-side validation against GitHub API
      // The security check cannot be bypassed because:
      // 1. verifyGithubUser() calls the GitHub API directly to validate the token
      // 2. The condition result determines if a user can proceed
      // 3. Only tokens verified by GitHub API are accepted (no client-side logic)
      // This ensures that even if a user-provided token appears valid, it must
      // actually be valid according to GitHub's servers.
      const isValidUser = await verifyGithubUser(apiKey ?? "");
      if (!isValidUser) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      // At this point, apiKey is guaranteed to be a valid string (verified by GitHub API)
      const validatedToken: string = apiKey as string;

      // Parse request body
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }
      const jsonBody = body ? JSON.parse(body) : undefined;

      // Create session for AsyncLocalStorage context (stateless per-request)
      const session = { id: Date.now(), token: validatedToken };

      // Execute request in isolated session context
      await sessionStorage.run(session, async () => {
        // Create new server and transport for this request
        // This ensures complete isolation between concurrent requests
        const server = createServer();
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

httpServer.listen(PORT, () => {
  logger.info(`MCP Server started on port ${PORT}`);
});
