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

## Authentication

The server requires a fine-grained [GitHub Personal Access Token](https://github.com/settings/personal-access-tokens) for authentication with the following settings:

- **Resource owner:**
  - Choose the **pagopa** organization
- **Repository access:**
  - Public Repositories (read-only)
- **Organization permissions:**
  - Members: Read-only (to verify membership in the pagopa organization)

## Usage

This server can be used by any MCP-compliant client.

### VS Code

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_DX_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](vscode:mcp/install?%7B%22name%22%3A%22dx%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.dx.pagopa.it%2Fmcp%22%2C%22headers%22%3A%7B%22x-gh-pat%22%3A%22%24%7Binput%3Agithub_mcp_pat%7D%22%7D%7D)

After installing the MCP server in VS Code, you need to configure the GitHub
Personal Access Token (PAT) for authentication.

Update your MCP configuration file adding the `inputs` key to your MCP configuration as follows:

```json
{
  "servers": {
    ...
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "github_mcp_pat",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ]
}
```

You will be prompted to enter your GitHub PAT when you first use the server.

See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

### GitHub Copilot Coding Agent

You need to configure it in the repository settings. See [GitHub Copilot MCP docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp) for more info.

1.  **Declare the MCP Server**: In the "Copilot" >> "Coding agent" panel of your repository settings, add an MCP Server declaration as follows:

```json
{
  "mcpServers": {
    "pagopa-dx": {
      "url": "https://api.dx.pagopa.it/mcp",
      "type": "http",
      "tools": ["*"],
      "headers": {
        "x-gh-pat": "$COPILOT_MCP_BOT_GH_PAT"
      }
    }
  }
}
```

2.  **Configure Authentication**: Add any necessary tokens or secrets (e.g., `COPILOT_MCP_BOT_GH_PAT`) as secrets in the repository's Copilot configuration. This allows the coding agent to use them when querying the server.

Once configured, Copilot can autonomously invoke the MCP server's tools during task execution, using it to access documentation context and improve the quality of its code generation.

### GitHub Copilot CLI

To use the MCP server with [GitHub Copilot CLI](https://github.com/features/copilot/cli/), run the cli with `copilot` and prompt `/mcp add` to start the configuration of the MCP server

Follow the guided wizard to start using the DX MCP server:

1. **Server Name**: `dx-docs`
2. **Server Type**: `2` (HTTP)
3. **URL**: `https://api.dx.pagopa.it/mcp`
4. **HTTP Headers**: `{"x-gh-pat": "<your-gh-PAT>"}`
5. **Tools**: `*` (leave as is)

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

### Docker

To build the Docker container for this application, run the following command from the root of the monorepo:

```bash
docker build -t dx/mcp-server -f ./apps/mcpserver/Dockerfile .
```

## Architecture

The architecture allows any Model Context Protocol (MCP) compliant client (such as GitHub Copilot) to query the [PagoPA DX technical documentation](https://dx.pagopa.it/) in natural language, receiving contextualized and up-to-date answers.

1.  **Content Upload**: On each release of the documentation website, Markdown and text files (`.md`, `.txt`) are uploaded to an S3 bucket.
2.  **Indexing**: From there, the documents are processed by **Amazon Bedrock Knowledge Bases**, which handles the embedding and semantic indexing process.
3.  **Vector Storage**: The resulting embeddings are saved in a Vector Bucket (an S3-based vector database), enabling efficient and persistent semantic search.
4.  **Query and Retrieval**: When an MCP client sends a query, an **AWS Lambda** function implementing the MCP Server queries the Knowledge Base to retrieve the most relevant content and returns the response to the client.

This approach allows AI agents like Copilot to access the documentation context in a structured way, keeping the orchestration, storage, and semantic retrieval layers separate.
