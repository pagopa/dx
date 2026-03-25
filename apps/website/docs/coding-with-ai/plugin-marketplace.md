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
`.github/copilot/settings.json` file to your repository with the following
content:

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
  // highlight-start
  "enabledPlugins": {
    "terraform@pagopa-dx": true,
    "azure@pagopa-dx": true,
    "project-management@pagopa-dx": true,
    "typescript@pagopa-dx": true,
    "nx@nrwl": true
  }
  // highlight-end
}
```

:::note This configuration format is specific to GitHub Copilot

If you use a different agent, follow its own plugin/marketplace documentation.
:::

When a developer opens the project in VS Code with Copilot enabled, the
marketplace is automatically registered. The enabled plugins appear with a
recommendation badge in the Extensions view.
