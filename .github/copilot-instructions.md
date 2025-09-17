# Copilot Coding Agent Instructions for pagopa/dx

## Repository Overview

This is the **DevEx Initiative** repository by PagoPA, containing shared tools, patterns, and best practices for improving developer experience and productivity across the organization. The repository consists of:

- **Purpose**: Shared monorepo with developer tooling, CI/CD workflows, Terraform modules, and documentation
- **Type**: TypeScript/JavaScript monorepo with Terraform infrastructure modules
- **Size**: ~42 workspace packages across apps, packages, infrastructure modules, providers, and actions
- **Languages**: TypeScript, JavaScript, HCL (Terraform), Shell, Go
- **Target runtimes**: Use versions specified in `.node-version` and `.terraform-version` files
- **Package manager**: pnpm with Turborepo for task orchestration

## Build and Validation Commands

### Prerequisites

**ALWAYS** run `pnpm install` before any other commands. Dependencies are managed via pnpm with workspace support.

### Core Commands (run in repository root)

1. **Install dependencies**: `pnpm install` (REQUIRED before any other commands)
2. **Build all packages**: `pnpm run build` or `pnpm build` (takes ~40s)
3. **Code review validation**: `pnpm run code-review` (runs typecheck, format:check, lint:check, test:coverage - takes ~23s)
4. **Type checking**: `pnpm turbo typecheck`
5. **Linting**: `pnpm turbo lint:check`
6. **Formatting**: `pnpm turbo format:check`
7. **Testing**: `pnpm turbo test:coverage`

### Terraform Commands

- **Validate Terraform**: Use pre-commit hooks via `pre-commit run -a` (requires pre-commit installation)
- **Module locking**: `infra/scripts/lock-modules.sh` for Terraform module version management

### SBOM Commands

- **Generate SBOMs**: `pnpm sbom-generate` (requires syft, grype, terraform, jq tools)
- **Validate SBOMs**: `pnpm sbom-validate`

### Workspace-specific Commands

```bash
# Target specific workspace
pnpm --filter WORKSPACE_NAME run COMMAND
# Example: run tests in CLI app
pnpm --filter @pagopa/dx-cli run test
```

### Critical Build Requirements

- **Node.js**: Use version specified in `.node-version` file
- **pnpm**: Use version configured via corepack (run `corepack enable`)
- **Terraform**: Use version specified in `.terraform-version` file  
- **Turbo**: 2+ (specified in CLI config, installed as dev dependency)
- **Tool versions**: Run `@pagopa/dx-cli info` after build to get current tool versions

### Build and Validation Errors

- **Format checking**: Prettier will fail if code is not properly formatted. Run `pnpm turbo format` to fix issues
- **Linting**: ESLint will fail on code style violations. Most issues can be auto-fixed
- **Type checking**: TypeScript compilation errors will cause build failure
- **Test coverage**: Failing tests or insufficient coverage (<80%) will fail the build
- **Turbo cache**: Cached builds are much faster (~256ms vs ~40s for full build)
- **Incremental builds**: Individual workspace builds take 1-6 seconds when using `--filter`

## Project Layout and Architecture

### Monorepo Structure

```
/
├── apps/                    # Main applications
│   ├── cli/                # @pagopa/dx-cli - Developer CLI tool
│   └── website/            # Documentation website (Docusaurus)
├── packages/               # Reusable packages
│   ├── azure-tracing/      # Azure observability utilities
│   ├── eslint-config/      # Shared ESLint configuration
│   ├── monorepo-generator/ # Project scaffolding tool
│   └── pnpm-plugin-pagopa/ # Custom pnpm plugin
├── infra/                  # Infrastructure as Code
│   ├── modules/           # Reusable Terraform modules (40+ modules)
│   ├── resources/         # Environment-specific resources (dev/prod)
│   ├── bootstrapper/      # Initial infrastructure setup
│   └── scripts/           # Infrastructure automation scripts
├── actions/               # GitHub Actions
│   ├── pr-comment/        # PR comment automation
│   ├── detect-node-package-manager/ # Package manager detection
│   └── swap-appsvc-slot/   # Azure App Service slot swapping
├── providers/             # Terraform providers
│   ├── azure/             # Azure-specific Terraform utilities
│   └── aws/               # AWS-specific Terraform utilities
└── containers/            # Container configurations
    └── self-hosted-runner/ # GitHub Actions self-hosted runner
```

### Configuration Files

- **Build**: `turbo.json` (task definitions), `package.json` (root workspace config)
- **TypeScript**: Individual `tsconfig.json` per workspace
- **Linting**: `packages/eslint-config/` (shared config), `.prettierignore`
- **Terraform**: `.terraform-version`, `.tflint.hcl`, `.pre-commit-config.yaml`
- **Dependencies**: `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Git**: `.gitignore`, `CODEOWNERS`, `.pre-commit-config.yaml`

### CI/CD Pipeline Structure

#### Primary Workflows (in `.github/workflows/`)

1. **TypeScript Code Review** (`_validate-typescript-code-review.yaml`):
   - Triggers on PR (opened, synchronize) for `apps/**`, `packages/**`, `actions/**`
   - Uses `js_code_review.yaml` reusable workflow
   - Runs `pnpm run code-review` command
   - Includes Codecov integration (if `CODECOV_TOKEN` set)

2. **Terraform Validation** (`_validate-terraform-static-analysis.yaml`):
   - Triggers on PR for `infra/**`, `.terraform-version`, `.pre-commit-config.yaml`
   - Uses `static_analysis.yaml` workflow with pre-commit hooks
   - Runs terraform_fmt, terraform_docs, terraform_tflint, terraform_validate, terraform_trivy

3. **Terraform Module Testing** (`_validate-terraform-test-modules.yaml`):
   - Triggers on PR for `infra/modules/**`
   - Matrix builds for each modified module
   - Runs `terraform test` for each module

#### Validation Requirements

- **Pre-commit hooks**: Must pass terraform validation, formatting, documentation generation
- **Code coverage**: Minimum 80% coverage required (configured in `codecov.yml`)
- **Linting**: ESLint and Prettier checks must pass
- **Type checking**: TypeScript compilation must succeed

### Dependencies and Hidden Requirements

- **Turbo**: Required for workspace task orchestration
- **Pre-commit**: Required for Terraform validation (includes multiple tools)
- **Azure CLI**: Required for Terraform module testing (Azure login)
- **SBOM tools**: syft, grype required for security scanning
- **Container runtime**: Docker/Podman for devcontainer support

### Timing Expectations

- **Full build**: ~40 seconds (all packages) - much faster with Turbo cache (~256ms)
- **Code review**: ~23 seconds (typecheck + lint + test + coverage)
- **Dependency installation**: ~8-10 seconds (clean install), ~5-6 seconds (with cache)
- **Individual workspace builds**: 1-6 seconds each with `--filter`
- **Documentation build**: ~30 seconds (Docusaurus website)

### Root Directory Files

```
.actrc                     # GitHub Actions CLI config
.changeset/               # Changesets for release management
.devcontainer/            # Development container configuration
.editorconfig            # Editor configuration
.github/                 # GitHub workflows and templates
.gitignore              # Git ignore rules
.node-version           # Node.js version specification
.pre-commit-config.yaml # Pre-commit hook configuration
.prettierignore         # Prettier ignore rules
.terraform-version      # Terraform version specification
.tflint.hcl            # Terraform linting configuration
.trivyignore           # Trivy security scanner ignore rules
.vscode/               # VS Code workspace settings
CODEOWNERS             # GitHub code ownership
CODE_OF_CONDUCT.md     # Community guidelines
CONTRIBUTING.md        # Contribution guidelines
README.md              # Repository documentation
codecov.yml            # Code coverage configuration
go.work                # Go workspace configuration
package.json           # Root package.json with scripts
pnpm-lock.yaml         # Dependency lock file
pnpm-workspace.yaml    # Workspace configuration
renovate.json          # Dependency update automation
sbom.sh               # Security bill of materials script
turbo.json            # Turborepo task configuration
```

### Key Scripts and Conventions

- **npm script naming**: Follow standard conventions (`build`, `test`, `lint`, `format`, `typecheck`)
- **Release management**: Use changesets (`pnpm changeset`) for version bumping
- **Module documentation**: Auto-generated via terraform-docs pre-commit hook
- **Security scanning**: SBOM generation for dependency tracking

## Critical Notes for Agents

1. **ALWAYS run `pnpm install` first** - the build will fail without dependencies
2. **Use repository-specified tool versions** - check `.node-version`, `.terraform-version` files or run `@pagopa/dx-cli info`
3. **Respect workspace structure** - don't modify files outside your target workspace unless necessary
4. **Pre-commit hooks are mandatory** for Terraform changes - they will run in CI
5. **Code coverage is enforced** - minimum 80% coverage required
6. **NEVER skip type checking** - TypeScript errors will fail CI
7. **Format code before committing** - use `pnpm turbo format` to fix Prettier issues
8. **Test locally before pushing** - run `pnpm run code-review` to catch issues early
9. **Use Turbo cache efficiently** - incremental builds are much faster than full rebuilds
10. **Check both local and CI validation** - CI runs additional checks like Terraform module tests

Trust these instructions and only search for additional information if these instructions are incomplete or found to be in error.
