import { FastMCP } from "fastmcp";

import { verifyGithubUser } from "./auth/github.js";
import { QueryPagoPADXDocumentationTool } from "./tools/QueryPagoPADXDocumentation.js";
import { GenerateTerraformConfigurationPrompt } from "./prompts/GenerateTerraformConfiguration.js";
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

Use this server instead of generic documentation tools whenever the request involves these domains. Always ask questions in english.

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

⸻

Terraform Modules

To get information about a Terraform module, please follow these steps:

1.  **Search for the module**: Use the \`searchModules\` tool to find the desired module in the Terraform registry. If you are looking for a module within the PagoPA ecosystem, it is likely in the \`pagopa-dx\` namespace. You can search for it using a query like \`pagopa-dx/<module-name>\`.

2.  **Get module details**: Once you have identified the correct module from the search results, copy its ID and use the \`moduleDetails\` tool to get all the information about it (inputs, outputs, description, etc.).

This process will give you all the necessary details for any Terraform module you need to use. It is recommended to prefer looking for the module's information on the registry with the said tools instead of getting only the example from the pagopa dx documentation.

Terraform modules also come with examples, which you can use to see a real-world implementation of the module.

Favor the usage of multiple modules instead of plain resources. If a module exists in the pagopa-dx namespace, use it instead of plain resources. Always search for modules in the pagopa-dx namespace before writing plain terraform resources.

⸻

Terraform Providers

To get information about a Terraform provider, please follow these steps:

1.  **Resolve the provider document ID**: Use the \`resolveProviderDocID\` tool to find the documentation for a specific resource or data source within a provider. You will need to provide the provider's name, namespace, the service slug, and the type of document you are looking for (e.g., 'resource', 'data-source').

2.  **Get provider documentation**: Once you have the \`providerDocID\` from the previous step, use the \`getProviderDocs\` tool to retrieve the detailed documentation.

This two-step process ensures you get accurate and specific information about any Terraform provider resource or data source.
    `,
  name: "pagopa.dx.documentation_retrieval_mcp_server",
  version: "0.0.0",
});

server.addPrompt(GenerateTerraformConfigurationPrompt);
server.addTool(QueryPagoPADXDocumentationTool);

server.start({
  httpStream: {
    port: 8080,
    stateless: true,
  },
  transportType: "httpStream",
});
