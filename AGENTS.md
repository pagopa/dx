# PagoPA DX - AI Agent Handbook

Guidelines and architectural context for DevEx initiative development.

## Core Rules

- **No Unsolicited PRs**: NEVER commit or open pull requests without explicit user instructions.
- **Changesets Mandatory**: Every PR with user-facing changes MUST include a changeset: `pnpm changeset`.

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

## Patterns

- **Terraform Modules**: Must include `README.md`, `examples/`, and `tests/`.
- **Cross-refs**: Libraries must use `workspace:` protocol for monorepo integrity.
- **Monorepo Structure**: Standard layouts for consistency across apps and packages.

## References

- [DX Documentation site](https://dx.pagopa.it/docs/)
- [Local Instructions](.github/instructions/): TypeScript, Terraform, PR, and Commit guidelines.
