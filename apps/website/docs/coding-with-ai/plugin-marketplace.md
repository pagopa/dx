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

```json title=".github/copilot/settings.json"
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

:::note This configuration format is specific to GitHub Copilot

If you use a different agent, follow its own plugin/marketplace documentation.
:::

When a developer opens the project in VS Code with Copilot enabled, the
marketplace is automatically registered. The enabled plugins appear with a
recommendation badge in the Extensions view.

## Available Plugins

### `terraform@pagopa-dx`

Brings Terraform code generation and module management capabilities aligned with
PagoPA DX standards.

**Skills**

| Name                       | Description                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terraform-best-practices` | Generates Terraform code following PagoPA DX best practices. Enforces module-first usage from the `pagopa-dx` registry, discovers module capabilities dynamically, and validates all generated code before presenting it to the user. |

**Commands**

| Name                                | Description                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-terraform-module-diagram` | Generates a Mermaid flowchart diagram for a Terraform module, analyzing its resources and dependencies. Creates a `diagram.mmd` file and adds a reference to the SVG in the module's `README.md`. |
| `migrate-terraform-module`          | Guides migration of Terraform modules from one version to another. Analyzes changelogs, identifies breaking changes, and applies the necessary configuration updates.                             |

---

### `azure@pagopa-dx`

Provides skills and guidance for Azure-specific infrastructure patterns.

**Skills**

| Name                    | Description                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `azure-keyvault-secret` | Creates secure `azurerm_key_vault_secret` resources using the write-only `value_wo` pattern, keeping secret values out of Terraform state. Requires Terraform ≥ 1.11.0 and azurerm provider ≥ 4.23. |

---

### `project-management@pagopa-dx`

Streamlines project management workflows through Jira integration and GitHub
collaboration conventions.

**Skills**

| Name                 | Description                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-jira-issue`  | Quickly captures a bug, feature, or improvement as a Jira issue without interrupting the development flow.                                                    |
| `github-conventions` | Provides guidelines for pull request titles/descriptions, commit messages, and branch naming to ensure consistency and readability in the repository history. |
| `jira-cli`           | A concise reference for using the Atlassian CLI (`acli`) to search, edit, and create Jira work items across projects or boards.                               |

**Agents**

| Name                 | Description                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `backlog-refinement` | Interactively refines and updates Jira backlog items, collecting user input before applying changes. Analyzes the codebase to provide context-aware descriptions and metadata. |

---

### `typescript@pagopa-dx`

Expert assistance for TypeScript development within the PagoPA DX ecosystem.

**Agents**

| Name                    | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `typescript-mcp-expert` | Expert assistant for developing Model Context Protocol (MCP) servers in TypeScript. |
