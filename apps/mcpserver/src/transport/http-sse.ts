/**
 * HTTP SSE (Server-Sent Events) Transport Layer
 *
 * This module implements a custom HTTP transport for the MCP server using
 * Server-Sent Events (SSE) for real-time communication. It's designed to work
 * in serverless environments like AWS Lambda.
 *
 * Features:
 * - Stateless request handling (no persistent connections)
 * - OAuth 2.0 discovery endpoints (RFC 8414, RFC 8707)
 * - CORS support with configurable origins
 * - Request validation with Zod schemas
 * - Authentication middleware integration
 * - Security headers and HTTPS enforcement
 *
 * Endpoints:
 * - POST /mcp - Main MCP protocol endpoint
 * - GET /.well-known/oauth-authorization-server - OAuth metadata (RFC 8414)
 * - GET /.well-known/oauth-protected-resource - Protected resource metadata (RFC 8707)
 * - GET /oauth/authorize - OAuth authorization endpoint
 * - POST /oauth/token - OAuth token exchange endpoint
 * - POST /oauth/register - OAuth client registration (optional)
 *
 * @module transport/http-sse
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  MessageExtraInfo,
} from "@modelcontextprotocol/sdk/types.js";
import type { IncomingMessage, ServerResponse } from "http";

import { getLogger } from "@logtape/logtape";
import { createServer as createHttpServer } from "http";
import { z } from "zod";

import type { AuthInfo } from "../auth/tokenMiddleware.js";

import {
  handleOAuthAuthorize,
  handleOAuthRegister,
  handleOAuthToken,
  OAuthTokenSchema,
} from "../auth/oauth.js";
import {
  isOriginAllowed,
  securityConfigLocal as securityConfig,
} from "../utils/security.js";

const logger = getLogger(["mcpserver", "http-sse-transport"]);

/**
 * Request validation schemas for OAuth endpoints
 * These schemas ensure incoming requests have the correct structure
 */
const OAuthRegisterRequestSchema = z.object({
  client_name: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  redirect_uris: z.array(z.string().url()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});

/**
 * Configuration options for HttpSseTransport
 */
type HttpSseTransportOptions = {
  /**
   * Optional authentication handler
   */
  authenticate?: (request: IncomingMessage) => Promise<AuthInfo | undefined>;

  /**
   * Base path for MCP endpoint
   */
  basePath?: string;

  /**
   * OAuth metadata for discovery endpoint
   */
  oauthMetadata?: {
    authorization_endpoint: string;
    grant_types_supported: string[];
    issuer: string;
    response_types_supported: string[];
    scopes_supported?: string[];
    token_endpoint: string;
  };

  /**
   * Port to listen on
   */
  port: number;
};

/**
 * Custom HTTP SSE (Server-Sent Events) transport for AWS Lambda compatibility.
 * This transport is stateless and handles each request independently.
 */
export class HttpSseTransport implements Transport {
  // Event handlers as properties (not methods)
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(
    message: T,
    extra?: MessageExtraInfo,
  ) => void;

  private mcpServer: null | Server = null;
  private readonly options: HttpSseTransportOptions;
  // Response queue for stateless operation
  private pendingResponses = new Map<
    null | number | string,
    (response: JSONRPCResponse) => void
  >();

  private server: null | ReturnType<typeof createHttpServer> = null;

  constructor(options: HttpSseTransportOptions) {
    this.options = {
      basePath: "/mcp",
      ...options,
    };
  }

  /**
   * Closes the transport
   */
  async close(): Promise<void> {
    if (this.server) {
      const server = this.server;
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info("HTTP SSE server closed");
          resolve();
        });
      });
      this.server = null;
    }

    if (this.onclose) {
      this.onclose();
    }
  }

  /**
   * Sends a JSON-RPC message to the client
   */
  async send(message: JSONRPCResponse): Promise<void> {
    logger.debug(`Sending JSON-RPC response`, { id: message.id });

    // Resolve the pending response promise
    const resolver = this.pendingResponses.get(message.id ?? null);
    if (resolver) {
      resolver(message);
    } else {
      logger.warn(
        `No pending request found for response with id: ${message.id}`,
      );
    }
  }

  /**
   * Sets the MCP server instance
   */
  setServer(server: Server): void {
    this.mcpServer = server;
  }

  /**
   * Starts the HTTP server
   */
  async start(): Promise<void> {
    if (this.server) {
      logger.warn("Server already started");
      return;
    }

    this.server = createHttpServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    const server = this.server;
    await new Promise<void>((resolve) => {
      server.listen(this.options.port, () => {
        logger.info(`HTTP SSE server listening on port ${this.options.port}`);
        resolve();
      });
    });
  }
  /**
   * Handles JSON-RPC requests
   */
  private async handleJsonRpcRequest(
    req: IncomingMessage,
    res: ServerResponse,
    sessionData: Record<string, unknown> | undefined,
  ): Promise<void> {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        // Validate JSON before parsing to prevent crashes
        if (!body || body.trim().length === 0) {
          throw new Error("Empty request body");
        }
        const message = JSON.parse(body) as JSONRPCRequest;

        // Validate message structure
        if (!message.jsonrpc || !message.method) {
          throw new Error("Invalid JSON-RPC message structure");
        }

        logger.debug(`Received JSON-RPC request: ${message.method}`, {
          id: message.id,
        });

        // Store session data for this request
        if (sessionData && this.mcpServer) {
          (
            this.mcpServer as unknown as {
              _sessionData?: Record<string, unknown>;
            }
          )._sessionData = sessionData;
        }

        // Create a promise that will be resolved when the response is ready
        const responsePromise = new Promise<JSONRPCResponse>((resolve) => {
          this.pendingResponses.set(message.id, resolve);
        });

        // Process the message through the SDK
        if (this.onmessage) {
          // Cast needed: MessageExtraInfo.authInfo has internal SDK type that may differ from our Record<string, unknown>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.onmessage(message, { authInfo: sessionData as any });

          // Wait for the response
          const response = await Promise.race([
            responsePromise,
            new Promise<JSONRPCResponse>((_, reject) =>
              setTimeout(() => reject(new Error("Response timeout")), 30000),
            ),
          ]);

          // Send the response
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));

          // Clean up
          this.pendingResponses.delete(message.id);
        } else {
          throw new Error("Message handler not registered");
        }
      } catch (error) {
        logger.error("Error processing JSON-RPC request");
        const errorResponse = {
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
          id: null,
          jsonrpc: "2.0" as const,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(errorResponse));
      }
    });
  }

  private async handleMcpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      logger.debug("[handleMcpRequest] Inizio gestione richiesta MCP", {
        method: req.method,
        url: req.url,
      });
      // Authenticate request if handler is provided
      let sessionData: Record<string, unknown> | undefined;
      if (this.options.authenticate) {
        logger.debug(
          "[handleMcpRequest] Autenticazione richiesta, invoco authenticate...",
        );
        try {
          sessionData = await this.options.authenticate(req);
          logger.debug("[handleMcpRequest] Risultato authenticate:", {
            sessionData,
          });
        } catch (error) {
          logger.error("[handleMcpRequest] Error in authenticate");
          if (
            error instanceof Response &&
            (error.status === 401 || error.status === 403)
          ) {
            res.writeHead(error.status, {
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: error.statusText }));
            return;
          }
          throw error;
        }

        // If authentication returns undefined, it means the user needs to authenticate
        if (sessionData === undefined) {
          logger.warn(
            "[handleMcpRequest] Authentication returned undefined (unauthenticated)",
          );
          // WWW-Authenticate header according to MCP/OAuth2 spec
          const proto = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host;
          const authzUri = `${proto}://${host}/oauth/authorize`;
          const resource = `${proto}://${host}${this.options.basePath}`;
          res.writeHead(401, {
            "Content-Type": "application/json",
            "WWW-Authenticate": `Bearer authorization_uri="${authzUri}", resource="${resource}"`,
          });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      // Handle GET requests (SSE endpoint)
      if (req.method === "GET") {
        logger.debug("[handleMcpRequest] Handling SSE (GET)");
        await this.handleSseConnection(req, res);
        return;
      }

      // Handle POST requests (JSON-RPC messages)
      if (req.method === "POST") {
        logger.debug("[handleMcpRequest] Handling JSON-RPC (POST)");
        await this.handleJsonRpcRequest(req, res, sessionData);
        return;
      }

      logger.warn("[handleMcpRequest] Method not allowed", {
        method: req.method,
      });
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
    } catch (error) {
      logger.error("[handleMcpRequest] General error handling MCP request");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Internal server error",
        }),
      );
    }
  }

  /**
   * Handles OAuth authorization endpoint (proxy to GitHub)
   */
  private async handleOAuthAuthorizeEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(req.url || "/", `https://${req.headers.host}`);
      const redirectUrl = await handleOAuthAuthorize(url.searchParams);

      // Redirect to GitHub OAuth
      res.writeHead(302, {
        Location: redirectUrl,
      });
      res.end();
    } catch (error) {
      logger.error("Error handling OAuth authorize");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "invalid_request",
          error_description:
            error instanceof Error ? error.message : "Invalid request",
        }),
      );
    }
  }

  /**
   * Handles OAuth discovery endpoint
   */
  private async handleOAuthDiscovery(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // Return configured OAuth metadata if available
    const metadata =
      this.options.oauthMetadata ||
      ({
        authorization_endpoint: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/oauth/authorize`,
        grant_types_supported: ["authorization_code"],
        issuer: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`,
        response_types_supported: ["code"],
        token_endpoint: `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}/oauth/token`,
      } as const);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metadata));
  }

  /**
   * Handles OAuth protected resource discovery endpoint (RFC 8707)
   */
  private async handleOAuthProtectedResourceDiscovery(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const serverUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

    const metadata = {
      authorization_servers: [serverUrl],
      bearer_methods_supported: ["header"],
      resource: serverUrl,
      resource_documentation: `${serverUrl}/docs`,
      scopes_supported: ["user"],
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metadata));
  }

  /**
   * Handles OAuth register endpoint with validation
   */
  private async handleOAuthRegister(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const body = await this.readRequestBody(
      req,
      securityConfig.MAX_REQUEST_SIZE,
    );
    const validatedBody = OAuthRegisterRequestSchema.parse(body);

    const result = await handleOAuthRegister(validatedBody);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  }

  /**
   * Handles OAuth token endpoint with PKCE validation
   */
  private async handleOAuthTokenEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const formData = await this.readFormBody(
        req,
        securityConfig.MAX_REQUEST_SIZE,
      );
      const body = Object.fromEntries(formData.entries());
      // Assicurati che body sia validato con lo schema Zod
      const tokenData = await handleOAuthToken(OAuthTokenSchema.parse(body));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tokenData));
    } catch (error) {
      logger.error("Error handling OAuth token exchange");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "invalid_request",
          error_description:
            error instanceof Error ? error.message : "Invalid request",
        }),
      );
    }
  }

  /**
   * Handles incoming HTTP requests with security measures
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(req.url || "/", `https://${req.headers.host}`);

      // CORS validation
      const origin = req.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
        logger.warn(`CORS violation from origin: ${origin}`);
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Origin not allowed" }));
        return;
      }

      // Set CORS headers
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.setHeader(
        "Access-Control-Max-Age",
        securityConfig.CORS_MAX_AGE.toString(),
      );

      // Handle OPTIONS preflight
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Route to appropriate handler
      if (url.pathname === this.options.basePath) {
        await this.handleMcpRequest(req, res);
        // Enforce HTTPS in production
        // Cast needed: Socket.encrypted property not in base type definition
        const proto =
          req.headers["x-forwarded-proto"] ||
          (req.connection &&
          typeof (req.connection as { encrypted?: boolean }).encrypted !==
            "undefined" &&
          (req.connection as { encrypted?: boolean }).encrypted
            ? "https"
            : "http");
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction && proto !== "https") {
          logger.warn("Rejected non-HTTPS request in production", {
            proto,
            url: req.url,
          });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "HTTPS required" }));
          return;
        }
      } else if (url.pathname === "/oauth/register" && req.method === "POST") {
        await this.handleOAuthRegister(req, res);
      } else if (url.pathname === "/.well-known/oauth-authorization-server") {
        await this.handleOAuthDiscovery(req, res);
      } else if (url.pathname === "/.well-known/oauth-protected-resource") {
        await this.handleOAuthProtectedResourceDiscovery(req, res);
      } else if (url.pathname === "/oauth/authorize") {
        await this.handleOAuthAuthorizeEndpoint(req, res);
      } else if (url.pathname === "/oauth/token") {
        await this.handleOAuthTokenEndpoint(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch {
      logger.error("Unhandled error in request handler");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  /**
   * Handles SSE connections for streaming responses
   */
  private async handleSseConnection(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // Set SSE headers
    res.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });

    // Send endpoint URL as first event
    const endpointUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}${this.options.basePath}`;
    res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
      res.write(": ping\n\n");
    }, 30000);

    // Clean up on connection close
    req.on("close", () => {
      clearInterval(pingInterval);
      res.end();
    });
  }

  /**
   * Reads and validates request body as form data
   */
  private async readFormBody(
    req: IncomingMessage,
    maxSize: number,
  ): Promise<URLSearchParams> {
    return new Promise((resolve, reject) => {
      let body = "";
      let size = 0;

      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          reject(new Error("Request body too large"));
          return;
        }
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          resolve(new URLSearchParams(body));
        } catch {
          reject(new Error("Invalid form data"));
        }
      });

      req.on("error", reject);
    });
  }

  /**
   * Reads and validates request body size
   */
  private async readRequestBody(
    req: IncomingMessage,
    maxSize: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let body = "";
      let size = 0;

      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxSize) {
          reject(new Error("Request body too large"));
          return;
        }
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          // Validate body is not empty
          if (!body || body.trim().length === 0) {
            reject(new Error("Empty request body"));
            return;
          }
          // Parse and validate JSON structure
          const parsed = JSON.parse(body);
          if (typeof parsed !== "object" || parsed === null) {
            reject(new Error("Invalid JSON: must be an object"));
            return;
          }
          resolve(parsed);
        } catch {
          reject(new Error("Invalid JSON format"));
        }
      });

      req.on("error", reject);
    });
  }
}
