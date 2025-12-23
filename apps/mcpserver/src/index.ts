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

// Configure logging and monitoring
await configureLogging();
await configureAzureMonitoring();
const authConfig = await getConfig();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");
logger.info(`Authentication type: ${authConfig.MCP_AUTH_TYPE}`);
logger.info(`Server URL: ${authConfig.MCP_SERVER_URL}`);

// Load enabled prompts from catalog
logger.debug(`Loading enabled prompts...`);
const enabledPrompts = await getEnabledPrompts();
logger.debug(`Loaded ${enabledPrompts.length} enabled prompts`);

// Create MCP server instance
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

// Register all prompts
registerPrompts(server, enabledPrompts);

// Create HTTP SSE transport with OAuth authentication
const transport = new HttpSseTransport({
  authenticate:
    authConfig.MCP_AUTH_TYPE === "oauth" ? tokenMiddleware : undefined,
  port: 8080,
});

// Set the server instance in the transport
transport.setServer(server.server);

// Connect server to transport
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
