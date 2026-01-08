import type { IncomingMessage, ServerResponse } from "node:http";

import { getLogger } from "@logtape/logtape";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import * as http from "node:http";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { PromptEntry, ToolDefinition } from "./types.js";

import packageJson from "../package.json" with { type: "json" };
import { verifyGithubUser } from "./auth/github.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { withPromptLogging } from "./decorators/promptUsageMonitoring.js";
import { withToolLogging } from "./decorators/toolUsageMonitoring.js";
import { sessionStorage } from "./session.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeTool } from "./tools/SearchGitHubCode.js";

// Configure logging
await configureLogging();
await configureAzureMonitoring();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");

// Store enabled prompts and tools with decorators applied
const toolRegistry = new Map<string, ToolDefinition>();
const promptRegistry = new Map<string, PromptEntry>();

// Register tools with decorators
toolRegistry.set(
  QueryPagoPADXDocumentationTool.name,
  withToolLogging(QueryPagoPADXDocumentationTool as ToolDefinition),
);
toolRegistry.set(
  SearchGitHubCodeTool.name,
  withToolLogging(SearchGitHubCodeTool as ToolDefinition),
);

// Load and register enabled prompts
const enabledPrompts = await getEnabledPrompts();
enabledPrompts.forEach((catalogEntry) => {
  const decoratedPrompt = withPromptLogging(
    catalogEntry.prompt,
    catalogEntry.id,
  );
  promptRegistry.set(catalogEntry.prompt.name, {
    catalogEntry,
    prompt: decoratedPrompt,
  });
});

/**
 * Creates a new MCP server instance with all handlers registered.
 * This function is called for each request to ensure complete isolation
 * and thread-safety in concurrent scenarios (e.g., AWS Lambda warm starts).
 */
function createServer(): Server {
  const server = new Server(
    {
      name: "PagoPA DX Knowledge Retrieval MCP Server",
      version: packageJson.version,
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
    },
  );

  // Configure server error handler
  server.onerror = (error) => {
    logger.error("Server error", { error: error.message, stack: error.stack });
  };

  // Request handler for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Array.from(toolRegistry.values()).map((tool) => {
      const jsonSchema = zodToJsonSchema(tool.parameters, {
        $refStrategy: "none",
      }) as Record<string, unknown>;

      // Extract only MCP-compliant inputSchema fields
      const inputSchema: Record<string, unknown> = {
        type: "object",
      };

      if (jsonSchema.properties) {
        inputSchema.properties = jsonSchema.properties;
      }

      if (jsonSchema.required) {
        inputSchema.required = jsonSchema.required;
      }

      return {
        description: tool.description,
        inputSchema,
        name: tool.name,
      };
    }),
  }));

  // Request handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { arguments: args, name } = request.params;
    const tool = toolRegistry.get(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      // Get session from AsyncLocalStorage
      const session = sessionStorage.getStore();

      // Build context with session information
      const context = {
        session,
      };

      // Validate tool arguments using Zod schema
      const validationResult = tool.parameters.safeParse(args);

      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new Error(`Invalid arguments: ${errors}`);
      }

      const result = await tool.execute(validationResult.data, context);

      return {
        content: [
          {
            text: typeof result === "string" ? result : JSON.stringify(result),
            type: "text",
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Tool execution failed: ${name}`, { error: errorMessage });
      throw new Error(`Tool execution failed: ${errorMessage}`);
    }
  });

  // Request handler for listing prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: Array.from(promptRegistry.values()).map(({ catalogEntry }) => ({
      arguments: catalogEntry.prompt.arguments.map((arg) => ({
        description: arg.description,
        name: arg.name,
        required: arg.required,
      })),
      description: catalogEntry.prompt.description,
      name: catalogEntry.prompt.name,
    })),
  }));

  // Request handler for getting a prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { arguments: args, name } = request.params;
    const promptEntry = promptRegistry.get(name);

    if (!promptEntry) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Validate required arguments
    const missingArgs = promptEntry.catalogEntry.prompt.arguments
      .filter((arg) => arg.required)
      .filter((arg) => !args || !(arg.name in args))
      .map((arg) => arg.name);

    if (missingArgs.length > 0) {
      throw new Error(`Missing required arguments: ${missingArgs.join(", ")}`);
    }

    try {
      const content = await promptEntry.prompt.load(args || {});
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Prompt loading failed: ${name}`, { error: errorMessage });
      throw new Error(`Prompt loading failed: ${errorMessage}`);
    }
  });

  return server;
}

logger.info(
  `Server factory initialized with ${toolRegistry.size} tools and ${promptRegistry.size} prompts`,
);

/**
 * HTTP server for stateless MCP operations
 *
 * Each request:
 * 1. Authenticates via GitHub PAT (x-gh-pat header)
 * 2. Creates a new transport for stateless operation
 * 3. Executes in AsyncLocalStorage context for request-scoped data
 * 4. Cleans up resources after completion
 */
const PORT = 8080;
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

      // Separate security checks to avoid user-controlled bypass detection
      if (!apiKey) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing authentication token" }));
        return;
      }

      const isValidUser = await verifyGithubUser(apiKey);
      if (!isValidUser) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid authentication token" }));
        return;
      }

      // Parse request body
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }
      const jsonBody = body ? JSON.parse(body) : undefined;

      // Create session for AsyncLocalStorage context (stateless per-request)
      const session = { id: Date.now(), token: apiKey };

      // Execute request in isolated session context
      await sessionStorage.run(session, async () => {
        // Create new server and transport for this request
        // This ensures complete isolation between concurrent requests
        const server = createServer();
        const transport = new StreamableHTTPServerTransport({
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
