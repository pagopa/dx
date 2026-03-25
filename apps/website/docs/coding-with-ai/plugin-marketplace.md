---
sidebar_position: 12
---

# Plugin Marketplace

The **PagoPA DX Plugin Marketplace** is a curated collection of GitHub Copilot
plugins tailored for the PagoPA development ecosystem. Each plugin bundles
domain-specific skills, agents, commands, and MCP server configurations that
extend your AI assistant with focused capabilities.

Browse the full list of available plugins in the
[`plugins/` directory on GitHub](https://github.com/pagopa/dx/tree/main/plugins).

## Team Setup (Recommended)

To avoid asking every developer to manually add the marketplace, commit a
`.vscode/settings.json` file to your repository with the following content:

```json
{
  "extraKnownMarketplaces": {
    "pagopa-dx": {
      "source": {
        "source": "github",
        "repo": "pagopa/dx"
      }
    }
  }
}
```

Optionally, you can also enable specific plugins by default for all team
members:

```json
{
  "extraKnownMarketplaces": {
    "pagopa-dx": {
      "source": {
        "source": "github",
        "repo": "pagopa/dx"
      }
    }
  },
  "enabledPlugins": {
    "terraform@pagopa-dx": true,
    "azure@pagopa-dx": true,
    "project-management@pagopa-dx": true,
    "typescript@pagopa-dx": true
  }
}
```

When a developer opens the project in VS Code with Copilot enabled, the
marketplace is automatically registered. The enabled plugins appear with a
recommendation badge in the Extensions view.
