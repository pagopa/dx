---
sidebar_position: 10
---

# DX MCP Server

The **DX MCP Server** is a Model Context Protocol (MCP) server that empowers AI assistants with deep knowledge of PagoPA's DX ecosystem. It bridges the gap between AI-powered development tools and PagoPA's technical documentation, best practices, and code repositories.

## What is the Model Context Protocol?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to interact with external tools and data sources in a structured way. MCP-compliant clients (like GitHub Copilot, Claude Desktop, or VS Code) can connect to MCP servers to access specialized knowledge and capabilities.

## How It Works

The DX MCP Server provides AI assistants with access to:

1. **📚 PagoPA DX Documentation**: Query the complete [DX technical documentation](https://dx.pagopa.it/) using natural language through Amazon Bedrock Knowledge Bases
2. **🔍 GitHub Code Search**: Search for real-world code examples across PagoPA's GitHub repositories
3. **🎯 Smart Prompts**: Pre-configured prompts designed for common tasks like Terraform configuration, code review, and infrastructure analysis

## Getting Started

### Prerequisites

You'll need:
- An MCP-compliant AI assistant (GitHub Copilot, VS Code with Copilot, etc.)
- A GitHub Personal Access Token (PAT) with appropriate permissions

### Configuration

<details>
<summary><b>VS Code / GitHub Copilot</b></summary>

Add the following to your MCP configuration file. See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for details.

```json
{
  "servers": {
    "pagopa-dx": {
      "url": "https://api.dev.dx.pagopa.it/mcp",
      "type": "http",
      "headers": {
        "x-gh-pat": "${env:GH_PAT}"
      }
    }
  }
}
```

</details>

<details>
<summary><b>GitHub Copilot Coding Agent</b></summary>

Configure in your repository settings under "Copilot" >> "Coding agent". See [GitHub Copilot MCP docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp) for more info.

```json
{
  "mcpServers": {
    "pagopa-dx": {
      "url": "https://api.dev.dx.pagopa.it/mcp",
      "type": "http",
      "tools": ["*"],
      "headers": {
        "x-gh-pat": "$COPILOT_MCP_BOT_GH_PAT"
      }
    }
  }
}
```

</details>

## Available Capabilities

### Tools

- **QueryPagoPADXDocumentation**: Query the DX documentation using natural language
- **SearchGitHubCode**: Find code examples across PagoPA repositories

### Prompts

The server provides a collection of intelligent prompts for common development tasks. These prompts understand PagoPA's conventions and best practices.

import Link from '@docusaurus/Link';

<div style={{ textAlign: 'center', margin: '2rem 0' }}>
  <Link
    className="button button--primary button--lg"
    to="/docs/vibe-coding/prompts-catalog"
    style={{ paddingTop: '1rem', paddingBottom: '0rem', color: 'white', fontWeight: 'bold' }}>
    📚 Browse Available Prompts
  </Link>
</div>

## Learn More

- [MCP Server Technical README](https://github.com/pagopa/dx/blob/main/apps/mcpserver/README.md)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
