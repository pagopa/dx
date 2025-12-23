# @pagopa/dx-mcpserver

> An MCP server that support developers using DX tools.

This package contains the implementation of a Model Context Protocol (MCP) server.

## Features

The server currently exposes the following capabilities:

- **Tools**:
  - `QueryPagoPADXDocumentation`: Queries Amazon Bedrock Knowledge Bases to retrieve relevant content from the [DX documentation](https://dx.pagopa.it/).
  - `SearchGitHubCode`: Searches for code snippets in specified GitHub organization (defaults to pagopa), allowing users to find real-world examples of code usage.
- **Prompts**:
  - `GenerateTerraformConfiguration`: Guides the generation of Terraform configurations following PagoPA DX best practices.

### Extensibility

The server uses a modular architecture based on the `ITool` interface, making it easy to add new tools. See [docs/CREATING_TOOLS.md](./docs/CREATING_TOOLS.md) for a detailed guide on creating new tools.

## Authentication

See [docs/oauth-proxy-flow.md](./docs/oauth-proxy-flow.md) for details on the OAuth proxy flow.

## Usage

This server can be used by any MCP-compliant client.

### VS Code

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_DX_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](vscode:mcp/install?%7B%22name%22%3A%22dx%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.dx.pagopa.it%2Fmcp%22%2C%22headers%22%3A%7B%22x-gh-pat%22%3A%22%24%7Binput%3Agithub_mcp_pat%7D%22%7D%7D)

```json
{
  "servers": {
    "dx": {
      "url": "https://api.dx.pagopa.it/mcp",
      "type": "http"
    }
  }
}
```

See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

### GitHub Copilot Coding Agent

You need to configure it in the repository settings. See [GitHub Copilot MCP docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp) for more info.

**Declare the MCP Server**: In the "Copilot" >> "Coding agent" panel of your repository settings, add an MCP Server declaration as follows:

```json
{
  "mcpServers": {
    "pagopa-dx": {
      "url": "https://api.dx.pagopa.it/mcp",
      "type": "http",
      "tools": ["*"]
    }
  }
}
```

Once configured, Copilot can autonomously invoke the MCP server's tools during task execution, using it to access documentation context and improve the quality of its code generation.

### GitHub Copilot CLI

To use the MCP server with [GitHub Copilot CLI](https://github.com/features/copilot/cli/), run the cli with `copilot` and prompt `/mcp add` to start the configuration of the MCP server

Follow the guided wizard to start using the DX MCP server:

1. **Server Name**: `dx-docs`
2. **Server Type**: `2` (HTTP)
3. **URL**: `https://api.dx.pagopa.it/mcp`
4. **Tools**: `*` (leave as is)

Use `Tab` to navigate between fields and `Ctrl+S` to save.

## Development

This is a standard TypeScript project. To get started:

```bash
pnpm install
pnpm --filter @pagopa/dx-mcpserver build
```

You can run the following scripts:

- `pnpm --filter @pagopa/dx-mcpserver lint`: Lints the code.
- `pnpm --filter @pagopa/dx-mcpserver format`: Formats the code.
- `pnpm --filter @pagopa/dx-mcpserver test`: Runs tests.
- `pnpm --filter @pagopa/dx-mcpserver typecheck`: Checks types.

### Adding New Tools

To add a new tool to the MCP server:

1. Create a new tool class in `src/tools/` implementing the `ITool` interface
2. Register it in `src/utils/registerTools.ts`
3. Add tests in `src/tools/__tests__/`

See [docs/CREATING_TOOLS.md](./docs/CREATING_TOOLS.md) for a detailed step-by-step guide with examples.

### Security

The server implements several security best practices:

- **HTTPS Enforcement**: Rejects non-HTTPS requests in production
- **Input Validation**: All inputs validated with Zod schemas
- **OAuth PKCE**: Supports PKCE (Proof Key for Code Exchange) for secure OAuth flows
- **Log Sanitization**: Sensitive data (tokens, secrets) never logged
- **CORS Validation**: Strict origin validation

See [src/utils/security.ts](./src/utils/security.ts) for implementation details.

### Docker

To build the Docker container for this application, run the following command from the root of the monorepo:

```bash
docker build -t dx/mcp-server -f ./apps/mcpserver/Dockerfile .
```

## Architecture

### High-Level Architecture

The architecture allows any Model Context Protocol (MCP) compliant client (such as GitHub Copilot) to query the [PagoPA DX technical documentation](https://dx.pagopa.it/) in natural language, receiving contextualized and up-to-date answers.

1.  **Content Upload**: On each release of the documentation website, Markdown and text files (`.md`, `.txt`) are uploaded to an S3 bucket.
2.  **Indexing**: From there, the documents are processed by **Amazon Bedrock Knowledge Bases**, which handles the embedding and semantic indexing process.
3.  **Vector Storage**: The resulting embeddings are saved in a Vector Bucket (an S3-based vector database), enabling efficient and persistent semantic search.
4.  **Query and Retrieval**: When an MCP client sends a query, an **AWS Lambda** function implementing the MCP Server queries the Knowledge Base to retrieve the most relevant content and returns the response to the client.

This approach allows AI agents like Copilot to access the documentation context in a structured way, keeping the orchestration, storage, and semantic retrieval layers separate.

### Code Structure

```
src/
├── auth/                          # Authentication and authorization
│   ├── oauth.ts                   # OAuth 2.0 PKCE implementation
│   └── tokenMiddleware.ts         # Token validation middleware
├── config/                        # Configuration modules
│   ├── aws.ts                     # AWS Bedrock configuration
│   └── logging.ts                 # Logging configuration
├── decorators/                    # Function decorators
│   ├── promptUsageMonitoring.ts   # Prompt telemetry decorator
│   └── toolUsageMonitoring.ts     # Tool telemetry decorator
├── services/                      # External services
│   └── bedrock.ts                 # AWS Bedrock Knowledge Base client
├── tools/                         # MCP Tools (implement ITool)
│   ├── QueryPagoPADXDocumentation.ts
│   └── SearchGitHubCode.ts
├── prompts/                       # MCP Prompts
│   └── GenerateTerraformConfiguration.ts
├── transport/                     # MCP transport layer
│   └── http-sse.ts               # HTTP SSE transport implementation
├── types/                         # TypeScript type definitions
│   └── ITool.ts                  # Tool interface definition
├── utils/                         # Utility functions
│   ├── registerPrompts.ts        # Prompt registration utility
│   ├── registerTools.ts          # Tool registration utility
│   └── security.ts               # Security utilities (HTTPS, sanitization)
└── index.ts                       # Main server entry point
```

#### Key Components

- **ITool Interface**: All tools implement the `ITool` interface for consistency and type safety
- **OAuth Proxy**: Server acts as OAuth proxy to keep GitHub credentials secure (see [docs/oauth-proxy-flow.md](./docs/oauth-proxy-flow.md))
- **Security**: HTTPS enforcement, input validation with Zod, log sanitization
- **Telemetry**: Automatic tool and prompt usage monitoring with decorators
- **Type Safety**: Strong typing throughout, minimal use of `any` types
