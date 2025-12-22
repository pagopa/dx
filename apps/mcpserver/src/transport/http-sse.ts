import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import type { IncomingMessage, ServerResponse } from "http";

import { getLogger } from "@logtape/logtape";
import { createServer as createHttpServer } from "http";

import {
  handleOAuthAuthorize,
  handleOAuthToken,
  handleOAuthRegister,
} from "../auth/oauth.js";

const logger = getLogger(["mcpserver", "http-sse-transport"]);

interface HttpSseTransportOptions {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Optional authentication handler
   */
  authenticate?: (
    request: IncomingMessage,
  ) => Promise<Record<string, unknown> | undefined>;

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
   * Base path for MCP endpoint
   */
  basePath?: string;
}

/**
 * Custom HTTP SSE (Server-Sent Events) transport for AWS Lambda compatibility.
 * This transport is stateless and handles each request independently.
 */
export class HttpSseTransport implements Transport {
  private server: ReturnType<typeof createHttpServer> | null = null;
  private readonly options: HttpSseTransportOptions;
  private mcpServer: Server | null = null;

  // Event handlers as properties (not methods)
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(
    message: T,
    extra?: { requestInfo?: unknown; authInfo?: unknown },
  ) => void;

  // Response queue for stateless operation
  private pendingResponses = new Map<
    string | number | null,
    (response: JSONRPCResponse) => void
  >();

  constructor(options: HttpSseTransportOptions) {
    this.options = {
      basePath: "/mcp",
      ...options,
    };
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

    await new Promise<void>((resolve) => {
      this.server!.listen(this.options.port, () => {
        logger.info(`HTTP SSE server listening on port ${this.options.port}`);
        resolve();
      });
    });
  }

  /**
   * Handles incoming HTTP requests
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Enable CORS for all origins
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Handle MCP endpoint
    if (url.pathname === this.options.basePath) {
      await this.handleMcpRequest(req, res);
      return;
    }

    // Handle OAuth Dynamic Client Registration (DCR) endpoint
    if (url.pathname === "/oauth/register" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const json = JSON.parse(body);
          const result = await handleOAuthRegister(json);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "invalid_request",
              error_description: (err as Error).message,
            }),
          );
        }
      });
      return;
    }

    // Handle OAuth discovery endpoints
    if (url.pathname === "/.well-known/oauth-authorization-server") {
      await this.handleOAuthDiscovery(req, res);
      return;
    }

    if (url.pathname === "/.well-known/oauth-protected-resource") {
      await this.handleOAuthProtectedResourceDiscovery(req, res);
      return;
    }

    // Handle OAuth authorization endpoint (proxy)
    if (url.pathname === "/oauth/authorize") {
      await this.handleOAuthAuthorizeEndpoint(req, res);
      return;
    }

    // Handle OAuth token endpoint (proxy)
    if (url.pathname === "/oauth/token") {
      await this.handleOAuthTokenEndpoint(req, res);
      return;
    }

    // 404 for all other paths
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  /**
   * Handles MCP protocol requests
   */
  private async handleMcpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      logger.debug("[handleMcpRequest] Inizio gestione richiesta MCP", {
        url: req.url,
        method: req.method,
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
          logger.error("[handleMcpRequest] Errore in authenticate", { error });
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
            "[handleMcpRequest] Authenticate ha restituito undefined (non autenticato)",
          );
          // Header WWW-Authenticate secondo MCP/OAuth2
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
        logger.debug("[handleMcpRequest] Gestione SSE (GET)");
        await this.handleSseConnection(req, res, sessionData);
        return;
      }

      // Handle POST requests (JSON-RPC messages)
      if (req.method === "POST") {
        logger.debug("[handleMcpRequest] Gestione JSON-RPC (POST)");
        await this.handleJsonRpcRequest(req, res, sessionData);
        return;
      }

      logger.warn("[handleMcpRequest] Metodo non consentito", {
        method: req.method,
      });
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
    } catch (error) {
      logger.error("[handleMcpRequest] Errore generale gestione MCP request", {
        error,
      });
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
   * Handles SSE connections for streaming responses
   */
  private async handleSseConnection(
    req: IncomingMessage,
    res: ServerResponse,
    sessionData: Record<string, unknown> | undefined,
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
        const message = JSON.parse(body) as JSONRPCRequest;
        logger.debug(`Received JSON-RPC request: ${message.method}`, {
          id: message.id,
        });

        // Store session data for this request
        if (sessionData && this.mcpServer) {
          (
            this.mcpServer as unknown as { _sessionData?: unknown }
          )._sessionData = sessionData;
        }

        // Create a promise that will be resolved when the response is ready
        const responsePromise = new Promise<JSONRPCResponse>((resolve) => {
          this.pendingResponses.set(message.id, resolve);
        });

        // Process the message through the SDK
        if (this.onmessage) {
          this.onmessage(message, { authInfo: sessionData });

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
        logger.error("Error processing JSON-RPC request", { error });
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
      resource: serverUrl,
      authorization_servers: [serverUrl],
      scopes_supported: ["user"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${serverUrl}/docs`,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metadata));
  }

  /**
   * Handles OAuth authorization endpoint (proxy to GitHub)
   */
  private async handleOAuthAuthorizeEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const redirectUrl = await handleOAuthAuthorize(url.searchParams);

      // Redirect to GitHub OAuth
      res.writeHead(302, {
        Location: redirectUrl,
      });
      res.end();
    } catch (error) {
      logger.error("Error handling OAuth authorize", { error });
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
   * Handles OAuth token endpoint (proxy to GitHub)
   */
  private async handleOAuthTokenEndpoint(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const params = new URLSearchParams(body);
        const code = params.get("code");
        const redirectUri = params.get("redirect_uri");
        const grantType = params.get("grant_type");

        if (grantType !== "authorization_code") {
          throw new Error("Only authorization_code grant type is supported");
        }

        if (!code || !redirectUri) {
          throw new Error("code and redirect_uri are required");
        }

        const tokenData = await handleOAuthToken(code, redirectUri);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tokenData));
      } catch (error) {
        logger.error("Error handling OAuth token exchange", { error });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "invalid_request",
            error_description:
              error instanceof Error ? error.message : "Invalid request",
          }),
        );
      }
    });
  }

  /**
   * Sets the MCP server instance
   */
  setServer(server: Server): void {
    this.mcpServer = server;
  }

  /**
   * Sends a JSON-RPC message to the client
   */
  async send(
    message: JSONRPCResponse,
    options?: { relatedRequestId?: string | number },
  ): Promise<void> {
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
   * Closes the transport
   */
  async close(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
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
}
