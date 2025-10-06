import { FastMCP } from "fastmcp";

import { verifyGithubUser } from "./auth/github.js";
import { serverInstructions } from "./config/server.js";
import { GenerateTerraformConfigurationPrompt } from "./prompts/GenerateTerraformConfiguration.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { logger } from "./utils/logger.js";

const isAuthRequired = (process.env.AUTH_REQUIRED || "true") !== "false";

const server = new FastMCP({
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

        // Whatever you return here will be accessible in the `context.session` object.
        return {
          id: 1,
        };
      }
    : undefined,
  instructions: serverInstructions,
  name: "pagopa.dx.documentation_retrieval_mcp_server",
  version: "0.0.0",
});

logger.debug(`Server instructions: \n\n${serverInstructions}`);

server.addPrompt(GenerateTerraformConfigurationPrompt);
server.addTool(QueryPagoPADXDocumentationTool);

server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});
