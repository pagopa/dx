---
sidebar_position: 12
---

# Plugin Marketplace

The **PagoPA DX Plugin Marketplace** is a curated collection of GitHub Copilot
plugins tailored for the PagoPA development ecosystem. Each plugin bundles
domain-specific skills, agents, commands, and MCP server configurations that
extend your AI assistant with focused capabilities.

## Getting Started

### Add the Marketplace

Register the PagoPA DX marketplace as a plugin source in GitHub Copilot:

```bash
copilot plugin marketplace add pagopa/dx
```

This command tells Copilot where to look for plugins published by the PagoPA DX
team. You only need to run this once.

### Install a Plugin

Install any plugin listed in the marketplace using its name and the `@devex`
registry suffix:

```bash
copilot plugin install <plugin_name>@devex
```

For example, to install the `cloud` plugin:

```bash
copilot plugin install cloud@devex
```

Browse the full list of available plugins in the
[`plugins/` directory on GitHub](https://github.com/pagopa/dx/tree/main/plugins).

### Update a Plugin

Keep your installed plugins up to date with the latest skills and commands:

```bash
copilot plugin update <plugin_name>@devex
```
