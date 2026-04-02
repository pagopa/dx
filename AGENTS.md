# PagoPA DX - AI Agent Handbook

Guidelines and architectural context for DevEx initiative development.

## Core Rules

- **No Unsolicited PRs**: NEVER commit or open pull requests without explicit user instructions.
- **Version Plans Mandatory**: Every PR with user-facing changes MUST include a version plan: `pnpm nx release plan`.
- **Breaking Changes**: Be extremely cautious with breaking changes for reusable Terraform modules and GitHub workflows. Always provide clear migration paths in version plans. When renaming resources or changing interfaces, try to keep backward compatibility.

## Repository Map

- `apps/` - Applications: [cli](apps/cli/), [mcpserver](apps/mcpserver/), [website](apps/website/).
- `packages/` - Libraries: [eslint-config](packages/eslint-config/), [azure-tracing](packages/azure-tracing/), [mcp-prompts](packages/mcp-prompts/).
- `infra/modules/` - Opinionated, reusable Terraform modules for AWS and Azure.
- `infra/resources/` - Environment-specific infrastructure organized by `<env>/`.
- `providers/` - Custom Terraform providers in Go (`azure/`, `aws/`).
- `actions/` - Composite GitHub Actions with uniform structure (README, package.json).

## Technical Stack & Workflows

- **Package Manager**: [pnpm](pnpm-workspace.yaml).
  - Internal deps: use `workspace:^`.
  - Common deps: use `catalog:`.
- **Task Runner**: [Nx](nx.json) orchestrates everything.
  - `pnpm validate`: CI check (affected build, test, lint, format:check, typecheck).
  - `nx test <project>`: Target-specific execution.
- **Tools**:
  - `pnpm dx`: Local CLI access (shorthand for [apps/cli](apps/cli/)).
  - `mcpserver`: MCP server for DX documentation and code search.

## References

- [DX Documentation site](https://dx.pagopa.it/docs/)
- [Local Instructions](.github/instructions/): TypeScript, Terraform, PR, and Commit guidelines.
- [GitHub Conventions skill](.github/skills/github-conventions/SKILL.md): Rules for commit messages, PR titles/descriptions, and branch naming — use this skill whenever committing or opening a pull request.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
