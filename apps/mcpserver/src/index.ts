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
import crypto from "node:crypto";
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
 * Validates a GitHub token via the GitHub API.
 * Returns the token if valid, null otherwise.
 *
 * This function encapsulates the authentication logic to make
 * the security flow clearer to static analyzers.
 */
async function authenticateGitHubToken(
  token: string | undefined,
): Promise<null | string> {
  if (!token) {
    return null;
  }
  const isValid = await verifyGithubUser(token);
  return isValid ? token : null;
}

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
  toolDefinitions.forEach(({ id, requiresSession, tool: toolDef }) => {
    const decoratedTool = withToolLogging(toolDef);
    const { annotations } = decoratedTool;

    // Ensure parameters is a ZodObject (all tools must use z.object())
    const zodObject = decoratedTool.parameters as z.ZodObject<
      Record<string, z.ZodTypeAny>
    >;
    if (!zodObject.shape) {
      throw new Error(`Tool "${id}" must use z.object() for parameters schema`);
    }

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
  });

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
      // GitHub authentication - extract and validate token
      const authHeader = req.headers["x-gh-pat"];
      const rawToken =
        typeof authHeader === "string"
          ? authHeader
          : Array.isArray(authHeader)
            ? authHeader[0]
            : undefined;

      // Authenticate via GitHub API - returns validated token or null
      const apiKey = await authenticateGitHubToken(rawToken);
      if (apiKey === null) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

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
      const session = { id: crypto.randomUUID(), token: apiKey };

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
