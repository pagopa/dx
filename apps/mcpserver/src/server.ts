import type { getEnabledPrompts } from "@pagopa/dx-mcpprompts";

import { getLogger } from "@logtape/logtape";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import crypto from "node:crypto";
import * as http from "node:http";

import type { AppConfig } from "./config.js";

import { createBedrockRuntimeClient } from "./config/aws.js";
import { handleAskEndpoint } from "./handlers/ask.js";
import { handleSearchEndpoint } from "./handlers/search.js";
import { createServer } from "./mcp/server.js";
import { sessionStorage } from "./session.js";
import { createToolDefinitions } from "./tools/registry.js";
import {
  parseJsonBody,
  sendErrorResponse,
  setCorsHeaders,
} from "./utils/http.js";

export async function startHttpServer(
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
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      // Log incoming request for debugging
      logger.debug("Incoming request", {
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      // Configure CORS headers
      setCorsHeaders(res);

      // Handle OPTIONS for CORS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // Handle /ask endpoint for Bedrock Knowledge Base queries
      if (req.url?.includes("/ask") && req.method === "POST") {
        await handleAskEndpoint(req, res, config, kbRuntimeClient);
        return;
      }

      // Handle /search endpoint for documentation search
      if (req.url?.includes("/search") && req.method === "POST") {
        await handleSearchEndpoint(req, res, config, kbRuntimeClient);
        return;
      }

      // Only allow POST and DELETE for MCP endpoints
      if (req.method !== "POST" && req.method !== "DELETE") {
        return sendErrorResponse(res, 405, "Method not allowed");
      }

      try {
        // Parse request body
        let jsonBody: unknown;
        try {
          jsonBody = await parseJsonBody(req);
        } catch {
          return sendErrorResponse(res, 400, "Invalid JSON");
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
          sendErrorResponse(res, 500, "Internal server error");
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
