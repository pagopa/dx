---
sidebar_position: 10
---

# DX MCP Server

The **DX MCP Server** is a Model Context Protocol (MCP) server that empowers AI
assistants with deep knowledge of PagoPA's DX ecosystem. It bridges the gap
between AI-powered development tools and PagoPA's technical documentation, best
practices, and code repositories.

## What is the Model Context Protocol?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open
standard that enables AI assistants to interact with external tools and data
sources in a structured way. MCP-compliant clients (like GitHub Copilot, Claude
Desktop, or VS Code) can connect to MCP servers to access specialized knowledge
and capabilities.

## How It Works

The DX MCP Server provides AI assistants with access to:

1. **PagoPA DX Documentation**: Query the complete
   [DX technical documentation](https://dx.pagopa.it/docs) using natural
   language
2. **GitHub Code Search**: Search for real-world code examples across PagoPA's
   GitHub repositories
3. **Smart Prompts**: Pre-configured prompts designed for common tasks like
   Terraform configuration, code review, and infrastructure analysis

## Getting Started

### Prerequisites

You'll need:

- An MCP-compliant AI assistant (GitHub Copilot, VS Code with Copilot, etc.)
- A GitHub Personal Access Token (PAT) with
  [appropriate permissions](#authentication)

### Authentication

To authenticate, create a **fine-grained GitHub Personal Access Token** with the
**minimum required permissions**
[here](https://github.com/settings/personal-access-tokens) using the following
configuration:

- **Resource owner**
  - Select the **pagopa** organization
- **Repository access**
  - **Public repositories:** Read-only
- **Organization permissions**
  - **Members:** Read-only  
    _(required to verify membership in the pagopa organization)_

### Configuration

### VS Code / GitHub Copilot

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_DX_MCP_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=ffffff)](vscode:mcp/install?%7B%22name%22%3A%22dx%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.dx.pagopa.it%2Fmcp%22%2C%22headers%22%3A%7B%22x-gh-pat%22%3A%22%24%7Binput%3Agithub_mcp_pat%7D%22%7D%7D)

After installing the MCP server in VS Code, you need to configure the GitHub
Personal Access Token (PAT) for authentication.

Update your MCP configuration file adding the `inputs` key to your MCP
configuration as follows:

```json
{
  "servers": {
    "dx": {
      "url": "https://api.dx.pagopa.it/mcp",
      "type": "http",
      "headers": {
        "x-gh-pat": "${input:github_mcp_pat}"
      }
    }
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

See
[VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
for more info.

### GitHub Copilot Coding Agent

Configure in your repository settings under "Copilot" >> "Coding agent". See
[GitHub Copilot MCP docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp)
for more info.

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

### GitHub Copilot CLI

To use the MCP server with
[GitHub Copilot CLI](https://github.com/features/copilot/cli/), run the cli with
`copilot` and prompt `/mcp add` to start the configuration of the MCP server

Follow the guided wizard to start using the DX MCP server:

1. **Server Name**: `pagopa-dx`
2. **Server Type**: `2` (HTTP)
3. **URL**: `https://api.dx.pagopa.it/mcp`
4. **HTTP Headers**: `{"x-gh-pat": "<your-gh-PAT>"}`
5. **Tools**: `*` (leave as is)

Use `Tab` to navigate between fields and `Ctrl+S` to save.

## Available Capabilities

### Tools

- **QueryPagoPADXDocumentation**: Query the DX documentation using natural
  language
- **SearchGitHubCode**: Find code examples across PagoPA repositories

### Prompts

The server provides a collection of intelligent prompts for common development
tasks. These prompts give guidelines to the agent on PagoPA's conventions and
best practices. Explore them in the
[DX prompts catalog](/docs/coding-with-ai/prompts-catalog).

## Learn More

- [MCP Server Technical README](https://github.com/pagopa/dx/blob/main/apps/mcpserver/README.md)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
