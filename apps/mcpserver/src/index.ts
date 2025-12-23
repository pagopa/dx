/**
 * MCP Server entry point
 *
 * This file initializes and starts the Model Context Protocol (MCP) server.
 * The server provides tools for querying PagoPA DX documentation and searching
 * GitHub code, along with prompts for generating Terraform configurations.
 *
 * Architecture:
 * - Uses HTTP SSE (Server-Sent Events) transport for communication
 * - Supports OAuth 2.0 authentication with PKCE
 * - Integrates with AWS Bedrock Knowledge Base for documentation queries
 * - Includes telemetry and logging with Azure Application Insights
 *
 * @module index
 */

import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";

import packageJson from "../package.json" with { type: "json" };
import { tokenMiddleware } from "./auth/tokenMiddleware.js";
import { getConfig } from "./config/auth.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { serverInstructions } from "./config/server.js";
import { HttpSseTransport } from "./transport/http-sse.js";
import { registerPrompts } from "./utils/registerPrompts.js";
import { registerTools } from "./utils/registerTools.js";

// Configure logging (LogTape) and Azure Application Insights monitoring
await configureLogging();
await configureAzureMonitoring();

// Load authentication configuration from environment/SSM parameters
const authConfig = await getConfig();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");
logger.info(`Authentication type: ${authConfig.MCP_AUTH_TYPE}`);
logger.info(`Server URL: ${authConfig.MCP_SERVER_URL}`);

// Load enabled prompts from the centralized prompt catalog
// Prompts are filtered based on their enabled status in the catalog
logger.debug(`Loading enabled prompts...`);
const enabledPrompts = await getEnabledPrompts();
logger.debug(`Loaded ${enabledPrompts.length} enabled prompts`);

// Create MCP server instance with capabilities and instructions
// The server supports both tools (queryable functions) and prompts (reusable templates)
const server = new McpServer(
  {
    name: "PagoPA DX Knowledge Retrieval MCP Server",
    version: packageJson.version,
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
    },
    instructions: serverInstructions,
  },
);

logger.debug(`Server instructions: \n\n${serverInstructions}`);

// Register all tools
registerTools(server);

// Register all prompts from the catalog
registerPrompts(server, enabledPrompts);

// Create HTTP SSE (Server-Sent Events) transport
// SSE allows long-lived connections for real-time communication
// Authentication is enabled based on MCP_AUTH_TYPE configuration
const transport = new HttpSseTransport({
  authenticate:
    authConfig.MCP_AUTH_TYPE === "oauth" ? tokenMiddleware : undefined,
  port: 8080,
});

// Set the server instance in the transport for request handling
transport.setServer(server.server);

// Connect server to transport and start listening for requests
await server.connect(transport);

logger.info(`Server started successfully on ${authConfig.MCP_SERVER_URL}`);
logger.info("MCP endpoint started");
logger.debug(
  `Authentication enabled: ${authConfig.MCP_AUTH_TYPE === "pat" ? "YES (PAT)" : authConfig.MCP_AUTH_TYPE === "oauth" ? "YES (OAuth)" : "NO"}`,
);
if (authConfig.MCP_AUTH_TYPE === "oauth") {
  logger.debug(
    `OAuth discovery: ${authConfig.MCP_SERVER_URL}/.well-known/oauth-authorization-server`,
  );
}

// Handle graceful shutdown (only in local development, not in AWS Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    await server.close();
    process.exit(0);
  });
}
