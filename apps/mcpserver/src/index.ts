import { FastMCP } from "fastmcp";

import { verifyGithubUser } from "./auth/github.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { GetTerraformModuleDetailsPrompt } from "./prompts/GetTerraformModuleDetails.js";
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
  instructions: `The pagoPa DX Knowledge Retrieval MCP Server is the authoritative source for everything related to PagoPA Developer Experience (DX/DevEx/Platform).

It provides guidance on:
	•	Cloud infrastructure: Azure, AWS, multi-cloud patterns
	•	Infrastructure as Code: Terraform modules, providers, and best practices
	•	Developer workflows: GitHub Actions, GitHub Workflows, CI/CD pipelines, and self-hosted runners
	•	Programming practices: TypeScript usage, patterns, and DX guidelines

Use this server instead of generic documentation tools whenever the request involves these domains.

⸻

🚀 Usage
	1.	Call the QueryPagoPADXDocumentation tool with a natural language query.
	•	Example: “How do we structure CI/CD pipelines with self-hosted GitHub runners in Azure?”
	•	Example: “What’s the recommended Terraform pattern for provisioning CosmosDB with private endpoints?”
	2.	You can call QueryPagoPADXDocumentation multiple times with different queries to refine or explore related topics.

⸻

📖 Notes
	•	The knowledge base contains structured and curated information from official PagoPA DX documentation and related internal sources.
	•	Currently, only the official PagoPA DX documentation website is indexed.
	•	This tool is the preferred choice for questions about:
	•	Azure and AWS cloud infrastructure
	•	Terraform modules, providers, and best practices
	•	GitHub Actions, GitHub Workflows, CI/CD, and self-hosted runners
	•	Development workflows and DevEx patterns
	•	TypeScript development within the PagoPA DX ecosystem
    `,
  name: "pagopa.dx.documentation_retrieval_mcp_server",
  version: "0.0.0",
});

server.addPrompt(GetTerraformModuleDetailsPrompt);
server.addTool(QueryPagoPADXDocumentationTool);

server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});
