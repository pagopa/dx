# PagoPA DX - AI Coding Agent Instructions

This monorepo houses the DevEx Initiative: tools, patterns, and infrastructure modules to enhance developer productivity at PagoPA. The repository contains TypeScript packages/apps, Go-based Terraform providers, Terraform modules, GitHub Actions, and infrastructure definitions.

## Architecture Overview

**Monorepo Structure**:

- `apps/` - Applications: `cli` (DX CLI tool), `mcpserver` (Model Context Protocol server), `website` (documentation site), `opex-dashboard`
- `packages/` - Shared TypeScript libraries (e.g., `eslint-config`, `azure-tracing`, `mcp-prompts`, `monorepo-generator`, `savemoney`)
- `actions/` - GitHub Actions for CI/CD workflows (e.g., `pr-comment`, `incremental-rollout`, `filter-terraform-plan`)
- `infra/modules/` - Reusable Terraform modules for AWS/Azure (e.g., `azure_app_service`, `azure_function_app`, `aws_core_infra`)
- `infra/resources/` - Environment-specific infrastructure definitions organized as `<env>/<region>/`
- `providers/` - Custom Terraform providers (`azure/`, `aws/`) written in Go to extend DX capabilities
- `decisions/` - Architecture Decision Records documenting key technical choices

## Package Management & Workflows

**Package Manager**: Uses `pnpm` with workspaces and a catalog system (see [pnpm-workspace.yaml](../pnpm-workspace.yaml)):

- Dependencies declared with `catalog:` reference the centralized catalog for version management
- Internal workspace dependencies use `workspace:^` protocol
- Run `pnpm install` to install all dependencies across workspaces

**Task Runner**: Uses Nx:

- Build all projects: `nx run-many -t build`
- Run tests: `nx test <workspace-name>` or `nx run-many -t test`
- Run specific commands: `nx run <workspace-name>:<command>`
- Affected command for CI: `pnpm validate` (runs build, test, lint, format:check, typecheck on affected projects)
- See [nx.json](../nx.json) for target configurations and caching behavior

**Release Management**: Uses Changesets:

- Every PR with user-facing changes MUST include a changeset file: `pnpm changeset`
- Version bump: `pnpm version`
- Publish: `pnpm release`

## Key Tools & Commands

**DX CLI** ([apps/cli/](../apps/cli/)):

- Local development: `pnpm dx` or `node ./apps/cli/bin/index.js`
- Provides scaffolding, codebase migrations, and cost optimization tools

**MCP Server** ([apps/mcpserver/](../apps/mcpserver/)):

- Model Context Protocol server exposing DX documentation queries and GitHub code search
- Tools: `QueryPagoPADXDocumentation`, `SearchGitHubCode`
- Prompts: `GenerateTerraformConfiguration`

**SBOM Management**:

- Generate: `pnpm sbom-generate`
- Validate: `pnpm sbom-validate`

## Common Patterns

**Workspace Cross-References**: Internal packages reference each other via `workspace:^` in package.json. Check dependencies in [apps/cli/package.json](../apps/cli/package.json) for examples.

**Module Structure**: Terraform modules export opinionated, production-ready configurations. Review [infra/modules/azure_app_service/](../infra/modules/azure_app_service/) for the standard module pattern (README.md with usage, examples/, tests/).

**GitHub Actions**: Actions in [actions/](actions/) are composite actions with `action.yaml` manifests. They follow a consistent structure with README.md, CHANGELOG.md, and package.json for dependency tracking.

## References

- Documentation site: https://dx.pagopa.it/docs/
- Existing instructions: [.github/instructions/](../.github/instructions/) (code, test, PR, commit message guidelines)
