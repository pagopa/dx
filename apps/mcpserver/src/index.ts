import { getLogger } from "@logtape/logtape";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { getEnabledPrompts } from "@pagopa/dx-mcpprompts";
import { z } from "zod";

import type { AuthInfo } from "./auth/tokenMiddleware.js";

import packageJson from "../package.json" with { type: "json" };
import { tokenMiddleware } from "./auth/tokenMiddleware.js";
import { getConfig } from "./config/auth.js";
import { configureLogging } from "./config/logging.js";
import { configureAzureMonitoring } from "./config/monitoring.js";
import { serverInstructions } from "./config/server.js";
import { withPromptLogging } from "./decorators/promptUsageMonitoring.js";
import { withToolLogging } from "./decorators/toolUsageMonitoring.js";
import {
  executeQueryPagoPADXDocumentation,
  QUERY_DOCS_TOOL_NAME,
  QueryDocsInput,
  QueryDocsInputSchema,
} from "./tools/QueryPagoPADXDocumentation.js";
import {
  executeSearchGitHubCode,
  SEARCH_GITHUB_CODE_TOOL_NAME,
  SearchGitHubCodeInput,
  SearchGitHubCodeInputSchema,
} from "./tools/SearchGitHubCode.js";
import { HttpSseTransport } from "./transport/http-sse.js";
import { executePrompt } from "./utils/prompts.js";

// Configure logging
await configureLogging();
await configureAzureMonitoring();
const authConfig = await getConfig();

const logger = getLogger(["mcpserver"]);
logger.info("MCP Server starting...");
logger.info(`Authentication type: ${authConfig.MCP_AUTH_TYPE}`);
logger.info(`Server URL: ${authConfig.MCP_SERVER_URL}`);

// Load enabled prompts
logger.debug(`Loading enabled prompts...`);
const enabledPrompts = await getEnabledPrompts();
logger.debug(`Loaded ${enabledPrompts.length} enabled prompts`);

// Create MCP server instance using high-level API
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

// Register prompts
for (const catalogEntry of enabledPrompts) {
  logger.debug(`Registering prompt: ${catalogEntry.prompt.name}`);

  // Convert arguments to zod schema
  const argsSchema: Record<string, z.ZodTypeAny> = {};
  for (const arg of catalogEntry.prompt.arguments) {
    argsSchema[arg.name] = arg.required ? z.string() : z.string().optional(); // Keep original for context
  }

  server.registerPrompt(
    catalogEntry.prompt.name,
    {
      argsSchema: argsSchema,
      description: catalogEntry.prompt.description,
    },
    async (args: Record<string, unknown>) => {
      const decoratedExecutor = withPromptLogging(
        catalogEntry.id,
        executePrompt, // Keep original for context
      );
      const result = await decoratedExecutor(catalogEntry, args);
      return result;
    },
  );

  logger.debug(`Registered prompt: ${catalogEntry.prompt.name}`);
}

// Register tools
logger.debug(`Registering tool: ${QUERY_DOCS_TOOL_NAME}`);
server.registerTool(
  QUERY_DOCS_TOOL_NAME,
  {
    description: `This tool provides access to the complete PagoPA DX documentation covering:
- Getting started, monorepo setup, dev containers, and GitHub collaboration
- Git workflows and pull requests
- DX pipelines setup and management
- TypeScript development (npm scripts, ESLint, code review)
- Terraform (folder structure, DX modules, Azure provider, pre-commit hooks, validation, deployment, drift detection)
- Azure development (naming conventions, policies, IAM, API Management, monitoring, networking, deployments, static websites, Service Bus, data archiving)
- Container development (Docker images)
- Contributing to DX (Azure provider, Terraform modules, documentation)

All prompts and questions should be written in English.
For Terraform module details (input/output variables, examples), use the \`searchModules\` tool.`,
    inputSchema: QueryDocsInputSchema,
    title: "Query PagoPA DX documentation",
  },
  async (args: unknown) => {
    const decoratedExecutor = withToolLogging(
      QUERY_DOCS_TOOL_NAME,
      async (
        validatedArgs: QueryDocsInput, // Keep original for context
      ) => executeQueryPagoPADXDocumentation(validatedArgs),
    );
    const validatedArgs = QueryDocsInputSchema.parse(args);
    return await decoratedExecutor(validatedArgs);
  },
);
logger.debug(`Registered tool: ${QUERY_DOCS_TOOL_NAME}`);

logger.debug(`Registering tool: ${SEARCH_GITHUB_CODE_TOOL_NAME}`);
server.registerTool(
  SEARCH_GITHUB_CODE_TOOL_NAME,
  {
    description: `Search for code in a GitHub organization (defaults to pagopa).
Use this to find examples of specific code patterns, such as Terraform module usage.
For example, search for "pagopa-dx/azure-function-app/azurerm" to find examples of the azure-function-app module usage.
Returns file contents matching the search query.`,
    inputSchema: SearchGitHubCodeInputSchema,
    title: "Search GitHub organization code",
  },
  async (
    args: unknown,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) => {
    const decoratedExecutor = withToolLogging(
      SEARCH_GITHUB_CODE_TOOL_NAME,
      async (
        validatedArgs: SearchGitHubCodeInput,
        sessionData?: Record<string, unknown>,
      ) => {
        // Type guard per AuthInfo
        if (
          sessionData &&
          typeof sessionData.token === "string" &&
          typeof sessionData.clientId === "string" &&
          Array.isArray(sessionData.scopes) &&
          typeof sessionData.extra === "object"
        ) {
          return executeSearchGitHubCode(
            validatedArgs,
            sessionData as AuthInfo,
          );
        }
        throw new Error(
          "Invalid authInfo: missing required authentication data",
        );
      },
    );
    const validatedArgs = SearchGitHubCodeInputSchema.parse(args);
    return await decoratedExecutor(
      validatedArgs,
      extra.authInfo as Record<string, unknown> | undefined,
    );
  },
);
logger.debug(`Registered tool: ${SEARCH_GITHUB_CODE_TOOL_NAME}`);

// Create HTTP SSE transport

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
logger.info("MCP endpoint started");
logger.debug(
  `Authentication enabled: ${authConfig.MCP_AUTH_TYPE === "pat" ? "YES (PAT)" : "NO"}`,
);

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
