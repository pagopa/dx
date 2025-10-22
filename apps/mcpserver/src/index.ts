import { getLogger } from "@logtape/logtape";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import { FastMCP } from "fastmcp";

import { verifyGithubUser } from "./auth/github.js";
import { configureLogging } from "./config/logging.js";
import { serverInstructions } from "./config/server.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { SearchGitHubCodeTool } from "./tools/SearchGitHubCode.js";

// Configure logging
await configureLogging();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");

// Authentication is enabled based on the AUTH_REQUIRED environment variable.

const server = new FastMCP({
  authenticate: async (request) => {
    const authHeader = request.headers["x-gh-pat"];
    const apiKey =
      typeof authHeader === "string"
        ? authHeader
        : Array.isArray(authHeader)
          ? authHeader[0]
          : undefined;

    if (!apiKey || !(await verifyGithubUser(apiKey))) {
      throw new Response(null, {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    // The returned object is accessible in the `context.session`.
    return {
      id: 1,
      token: apiKey,
    };
  },
  instructions: serverInstructions,
  name: "PagoPA DX Knowledge Retrieval MCP Server",
  version: "0.0.0",
});

logger.debug(`Server instructions: \n\n${serverInstructions}`);

logger.debug(`Loading enabled prompts...`);

getEnabledPrompts().then((prompts) => {
  prompts.forEach((catalogEntry) => {
    logger.debug(`Adding prompt: ${catalogEntry.prompt.name}`);
    server.addPrompt(catalogEntry.prompt);
    logger.debug(`Added prompt: ${catalogEntry.prompt.name}`);
  });
});
server.addTool(QueryPagoPADXDocumentationTool);
server.addTool(SearchGitHubCodeTool);

// Starts the server in HTTP Stream mode.
server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});
