# @pagopa/dx-mcpserver

> An MCP server that support developers using DX tools.

This package contains the implementation of a Model Context Protocol (MCP) server.

## Features

The server currently exposes the following capabilities:

### MCP Protocol

- **Tools**:
  - `QueryPagoPADXDocumentation`: Queries Amazon Bedrock Knowledge Bases to retrieve relevant content from the [DX documentation](https://dx.pagopa.it/).
  - `SearchGitHubCode`: Searches for code snippets in specified GitHub organization (defaults to pagopa), allowing users to find real-world examples of code usage.
- **Prompts**:
  - `GenerateTerraformConfiguration`: Guides the generation of Terraform configurations following PagoPA DX best practices.

### REST API Endpoints

The server also exposes HTTP REST endpoints for direct documentation access:

#### POST /ask

AI-powered Q&A endpoint that generates contextual answers from the DX documentation.

**Request**:

```bash
curl -X POST https://api.dx.pagopa.it/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I setup Terraform modules?"}'
```

**Response**:

```json
{
  "answer": "To setup Terraform modules in PagoPA DX...",
  "sources": [
    "https://dx.pagopa.it/docs/terraform/modules/",
    "https://dx.pagopa.it/docs/getting-started/"
  ]
}
```

**Features**:

- Uses Amazon Bedrock RetrieveAndGenerate for AI-generated responses
- Returns relevant source URLs from documentation
- Automatically converts internal S3 URIs to public web URLs

#### POST /search

Semantic search endpoint that retrieves relevant documentation chunks.

**Request**:

```bash
curl -X POST https://api.dx.pagopa.it/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Azure naming conventions",
    "number_of_results": 5
  }'
```

**Response**:

```json
{
  "query": "Azure naming conventions",
  "results": [
    {
      "content": "Azure resources must follow...",
      "score": 0.9542,
      "source": "https://dx.pagopa.it/docs/azure/naming/"
    }
  ]
}
```

**Parameters**:

- `query` (required): Natural language search query
- `number_of_results` (optional): Number of results to return (1-20, default: 5)

**Features**:

- Uses Amazon Bedrock Retrieve API with optional reranking
- Returns relevance scores for each result
- Configurable result count

## Usage

This server can be used by any MCP-compliant client.

### VS Code

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_DX_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](vscode:mcp/install?%7B%22name%22%3A%22dx%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.dx.pagopa.it%2Fmcp%22%7D)

After installing the MCP server in VS Code, update your MCP configuration file as follows:

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

1.  **Declare the MCP Server**: In the "Copilot" >> "Coding agent" panel of your repository settings, add an MCP Server declaration as follows:

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
4. **HTTP Headers**: leave as is (no headers needed)
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
