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
import { createGithubUserVerifier } from "./auth/github.js";
import { loadConfig, type AppConfig } from "./config.js";
import {
  createBedrockRuntimeClient,
} from "./config/aws.js";
import { configureLogging } from "./config/logging.js";
import {
  configureAzureMonitoring,
} from "./config/monitoring.js";
import { withPromptLogging } from "./decorators/promptUsageMonitoring.js";
import { withToolLogging } from "./decorators/toolUsageMonitoring.js";
import { sessionStorage } from "./session.js";
import { createToolDefinitions, type ToolEntry } from "./tools/registry.js";
import { GetPromptResultType, ToolCallResult } from "./types.js";

type CreateServerParams = {
  enabledPrompts: Awaited<ReturnType<typeof getEnabledPrompts>>;
  requestId?: string;
  toolDefinitions: ToolEntry[];
};

const DEFAULT_PORT = 8080;

export async function main(
  env: NodeJS.ProcessEnv,
): Promise<http.Server | undefined> {
  const config = loadConfig(env);

  await configureLogging(config.logLevel);
  configureAzureMonitoring(config.monitoring);

  const logger = getLogger(["mcpserver"]);
  const enabledPrompts = await getEnabledPrompts();

  const httpServer = await startHttpServer(config, enabledPrompts);
  return httpServer;
}

/**
 * Validates a GitHub token via the GitHub API.
 * Returns the token if valid, null otherwise.
 *
 * This function encapsulates the authentication logic to make
 * the security flow clearer to static analyzers.
 */
async function authenticateGitHubToken(
  token: string | undefined,
  verifyGithubUser: (token: string) => Promise<boolean>,
): Promise<null | string> {
  if (!token) {
    return null;
  }
  const isValid = await verifyGithubUser(token);
  return isValid ? token : null;
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
  const verifyGithubUser = createGithubUserVerifier({
    requiredOrganizations: config.github.requiredOrganizations,
  });

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
        const apiKey = await authenticateGitHubToken(
          rawToken,
          verifyGithubUser,
        );
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
        // Extract request ID from AWS Lambda trace (undefined if not in AWS)
        const traceHeader = req.headers["x-amzn-trace-id"];
        const requestId =
          typeof traceHeader === "string"
            ? traceHeader.split(";")[0].replace("Root=", "")
            : undefined;

        const session = {
          id: crypto.randomUUID(),
          requestId,
          token: apiKey,
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
