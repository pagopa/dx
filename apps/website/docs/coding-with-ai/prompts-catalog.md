---
sidebar_position: 11
---

# Prompts Catalog

Browse all available MCP prompts for the PagoPA DX ecosystem. Each prompt is a
pre-configured command that helps you accomplish specific development tasks.

## How to Use a Prompt

Click on any **prompt ID** below to copy it. Then, use it in your AI assistant
following this pattern:

```text
/mcp.<your-server-name>.<prompt-id>
```

### Example

If your MCP server is configured as `pagopa-dx` and you want to use the
`generate-terraform-configuration` prompt:

```text
/mcp.pagopa-dx.generate-terraform-configuration
```

The AI assistant will execute the prompt with the appropriate context from your
workspace.

---

import MCPPrompts from '@site/src/components/MCPPrompts';

<MCPPrompts />
