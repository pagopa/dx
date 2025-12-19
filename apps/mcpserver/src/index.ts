import { getLogger } from "@logtape/logtape";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import { FastMCP } from "fastmcp";

import packageJson from "../package.json" with { type: "json" };
import { startPATVerificationFlow } from "./auth/github.js";
import { getOAuthProvider, startOAuthFlow } from "./auth/oauth.js";
import { getConfig } from "./config/auth.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { serverInstructions } from "./config/server.js";
import { withPromptLogging } from "./decorators/promptUsageMonitoring.js";
import { withToolLogging } from "./decorators/toolUsageMonitoring.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeTool } from "./tools/SearchGitHubCode.js";

// Configure logging
await configureLogging();
await configureAzureMonitoring();
const authConfig = await getConfig();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");
logger.info(`Authentication type: ${authConfig.MCP_AUTH_TYPE}`);
logger.info(`Server URL: ${authConfig.MCP_SERVER_URL}`);

// Initialize OAuth provider if using OAuth authentication
let authProxy;
if (authConfig.MCP_AUTH_TYPE === "oauth") {
  try {
    logger.debug("Initializing OAuth provider...");
    authProxy = await getOAuthProvider();
    logger.debug("OAuth provider initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize OAuth provider", { error });
    throw error;
  }
} else {
  logger.debug(
    `OAuth not enabled. Using auth type: ${authConfig.MCP_AUTH_TYPE}`,
  );
}

const server = new FastMCP({
  authenticate: async (request) => {
    if (authConfig.MCP_AUTH_TYPE === "pat") {
      return await startPATVerificationFlow(request);
    } else if (authConfig.MCP_AUTH_TYPE === "oauth") {
      return await startOAuthFlow(request);
    } else {
      logger.warn(
        `Unknown authentication type: ${authConfig.MCP_AUTH_TYPE}. Proceeding without authentication.`,
      );
      return undefined;
    }
  },
  instructions: serverInstructions,
  name: "PagoPA DX Knowledge Retrieval MCP Server",
  oauth:
    authConfig.MCP_AUTH_TYPE === "oauth"
      ? {
          authorizationServer: authProxy?.getAuthorizationServerMetadata(),
          enabled: true,
          protectedResource: {
            authorizationServers: [
              `${authProxy?.getAuthorizationServerMetadata().issuer}`,
              `${authConfig.MCP_SERVER_URL}/.well-known/oauth-authorization-server`,
            ],
            bearerMethodsSupported: ["header"],
            resource: `${authConfig.MCP_SERVER_URL}/mcp`,
            resourceName: "PagoPA DX MCP Server",
            scopesSupported: [],
          },
          proxy: authProxy,
        }
      : undefined,
  version: packageJson.version as `${number}.${number}.${number}`,
});

logger.debug(`Server instructions: \n\n${serverInstructions}`);

logger.debug(`Loading enabled prompts...`);

getEnabledPrompts().then((prompts) => {
  prompts.forEach((catalogEntry) => {
    logger.debug(`Adding prompt: ${catalogEntry.prompt.name}`);

    // Apply logging decorator to the prompt
    const decoratedPrompt = withPromptLogging(
      catalogEntry.prompt,
      catalogEntry.id,
    );

    server.addPrompt(decoratedPrompt);
    logger.debug(`Added prompt: ${catalogEntry.prompt.name}`);
  });
});

server.addTool(withToolLogging(QueryPagoPADXDocumentationTool));
server.addTool(withToolLogging(SearchGitHubCodeTool));

// Starts the server in HTTP Stream mode.
server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});

logger.debug(`Server started successfully on ${authConfig.MCP_SERVER_URL}`);
logger.debug(`MCP endpoint: ${authConfig.MCP_SERVER_URL}/mcp`);
logger.debug(
  `OAuth enabled: ${authConfig.MCP_AUTH_TYPE === "oauth" && authProxy ? "YES" : "NO"}`,
);
if (authConfig.MCP_AUTH_TYPE === "oauth") {
  logger.debug(
    `OAuth discovery: ${authConfig.MCP_SERVER_URL}/.well-known/oauth-authorization-server`,
  );
}
