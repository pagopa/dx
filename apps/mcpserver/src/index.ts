import { FastMCP } from "fastmcp";

import { serverInstructions } from "./config/server.js";
import { GenerateTerraformConfigurationPrompt } from "./prompts/GenerateTerraformConfiguration.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { logger } from "./utils/logger.js";

// Authentication is enabled based on the AUTH_REQUIRED environment variable.

const server = new FastMCP({
  instructions: serverInstructions,
  name: "PagoPA DX Knowledge Retrieval MCP Server",
  version: "0.0.0",
});

logger.debug(`Server instructions: \n\n${serverInstructions}`);

server.addPrompt(GenerateTerraformConfigurationPrompt);
server.addTool(QueryPagoPADXDocumentationTool);

// Starts the server in HTTP Stream mode.
server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});
