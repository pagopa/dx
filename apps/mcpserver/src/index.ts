import { FastMCP } from "fastmcp";

import { verifyGithubUser } from "./auth/github.js";
import { serverInstructions } from "./config/server.js";
import { GenerateTerraformConfigurationPrompt } from "./prompts/GenerateTerraformConfiguration.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { logger } from "./utils/logger.js";

// Authentication is enabled based on the AUTH_REQUIRED environment variable.
const isAuthRequired = (process.env.AUTH_REQUIRED || "false") !== "false";

const server = new FastMCP({
  /**
   * If authentication is required, this function verifies the user's GitHub token
   * by checking their organization membership.
   */
  authenticate: isAuthRequired
    ? async (request) => {
        const authHeader = request.headers["x-gh-pat"];
        const apiKey =
          typeof authHeader === "string"
            ? authHeader
            : Array.isArray(authHeader)
              ? authHeader[0]
              : undefined;

        logger.info(
          `Authenticating request with API key: ${apiKey ? "Provided" : "Not Provided"}`,
        );

        if (!apiKey || !(await verifyGithubUser(apiKey))) {
          throw new Response(null, {
            status: 401,
            statusText: "Unauthorized",
          });
        }

        // The returned object is accessible in the `context.session`.
        return {
          id: 1,
        };
      }
    : undefined,
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
