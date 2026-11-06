# @pagopa/dx-cli

<div align="center">

<img src="../../assets/pagopa-logo.png" width="100" alt="PagoPA logo">

# DX CLI

<p align="center">
  <i align="center">A CLI tool for managing DevEx (Developer Experience) guidelines and best practices 🚀</i>
</p>

</div>

## 📖 Overview

The DX CLI is a command-line tool designed to help developers manage and validate their development setup according to PagoPA's DevEx guidelines. It provides automated checks and validations to ensure repositories follow the established best practices and conventions.

## ✨ Features

- **Repository Validation**: Verify repository setup against DevEx guidelines with the `doctor` command
- **Code Migrations**: Apply automated migration scripts (codemods) to update code and configurations
- **Project Initialization**: Bootstrap new monorepo projects with standardized structure
- **Command Specification**: Export a machine-readable schema of the CLI command surface
- **Cost Optimization**: Analyze Azure subscriptions to identify unused or underutilized resources
- **Project Information**: Display comprehensive information about your project setup and tools
- **Developer Experience Optimization**: Ensure consistent development practices across projects

## 🚀 Installation

Install the CLI globally using your preferred package manager:

```bash
# Using npm
npm install -g @pagopa/dx-cli

# Using yarn
yarn global add @pagopa/dx-cli

# Using pnpm
pnpm add -g @pagopa/dx-cli
```

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/pagopa/dx.git
cd dx

# Install dependencies (using npm)
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install

# Build the CLI
npm run build
# Or: yarn build
# Or: pnpm build

# Run the CLI
node ./apps/cli/bin/index.js --help
```

## 🔐 Authentication

The CLI requires GitHub authentication for every command **except** `--version`
and `--help`. Authenticate using one of the following (checked in this order):

1. The `GH_TOKEN` environment variable
2. The `GITHUB_TOKEN` environment variable
3. The [GitHub CLI](https://cli.github.com/) — run `gh auth login`

If no credential is found, the CLI exits with an error asking you to log in.

> Telemetry is emitted only for members of the `pagopa` GitHub organization;
> all other users can use the CLI normally with telemetry disabled.

## 🛠️ Usage

### Available Commands

#### `doctor`

Verify the repository setup according to the DevEx guidelines.

```bash
dx doctor
```

This command will:

- Check if you're in a valid Git repository
- Validate that required monorepo scripts are present in package.json
- Check that the `turbo.json` file exists
- Verify that the installed `turbo` version meets the minimum requirements

**Example output:**

```bash
$ dx doctor
Checking monorepo scripts...
✅ Monorepo scripts are correctly set up
```

#### `codemod`

Manage and apply migration scripts (codemods) to the repository.

```bash
# List available codemods
dx codemod list

# Apply a specific codemod by ID
dx codemod apply <id>
```

This command helps you:

- View all available migration scripts for your repository
- Apply automated code transformations to keep your codebase up to date
- Migrate configurations and code patterns to newer standards

#### `init`

Bootstrap a new monorepo project with standardized structure and optional remote repository provisioning.

```bash
dx init
```

This command will:

- Check that required tools (Terraform CLI and Corepack) are installed
- Interactively prompt for repository name, GitHub organization, and description
- **Check that the target GitHub repository does not already exist before proceeding**
- Generate a monorepo structure following PagoPA DevEx guidelines
- Ask whether the scaffolded workspace should be published to GitHub immediately
- If confirmed, create the remote GitHub repository using Terraform and push the initial codebase

If the specified GitHub repository already exists, the command will fail early with a clear error message, preventing accidental overwrites.

**Example usage:**

```bash
$ dx init
? Name my-monorepo
? GitHub Organization pagopa
? Description My new PagoPA monorepo
? The project is created on my-monorepo. Would you like to publish it to GitHub at pagopa/my-monorepo now? Yes
...

✔ Terraform CLI is installed!
✔ Workspace files created successfully!
✔ GitHub repository created successfully!
✔ Code pushed to GitHub successfully!

Workspace created successfully!
- Name: my-monorepo
- GitHub Repository: https://github.com/pagopa/my-monorepo
```

> [!NOTE]
> The command will fail early if required tools are missing.
> If you choose not to publish immediately, the CLI prints the manual Terraform and git steps required to finish the setup later.

##### Repository Terraform state

Publishing with `dx init` initially creates **temporary local state** at
`infra/repository/terraform.tfstate`. Do not delete it, commit it, or run
repository Terraform apply from another device while it is local. If publishing
is skipped, the same responsibility starts when you manually apply
`infra/repository`.

The first `dx add environment` asks you to confirm the permanent repository-state
destination. It uses that environment's existing or newly provisioned Azure
backend, container `terraform-state`, and key
`<prefix>/<domain>/repository.tfstate`. `--yes` confirms both initialization and
repository-state placement when running non-interactively.

Before changing GitHub environments, the CLI migrates state, verifies the remote
repository identity and copied resources, and checks that Terraform reads the
same backend. Only then does it delete local state and backups. The success
summary reports **Repository state: remote and verified** and the destination,
without printing state contents. Commit the `infra/repository` changes,
including the backend in `providers.tf` and environment configuration in
`main.tf`, so other operators share the same destination and desired state.
Later environment additions retain this backend, even when their cloud
subscription or tenant differs. Existing core/bootstrapper state keys are
unchanged.

If the first environment is added on another machine without local state, the
CLI generates `infra/repository/repository-state-imports.tf` to recover existing
GitHub resources. It includes repository settings, branches and protection,
environments, deployment policies and permissions. The workflow-permissions
`null_resource` is not importable; its idempotent provisioner reasserts the
configured permissions. Recovery refuses plans that destroy or replace resources.
Generated import blocks are removed only after recovery and remote-state
verification succeed; interrupted recovery resumes these imports before any
environment changes.

On failure, GitHub environment apply is blocked. Keep the local state,
`terraform.tfstate.dx-backup`, backend configuration and any generated imports.
Retry from the repository root with the same `dx add environment` arguments.
An occupied, unconfigured destination is never adopted automatically; a state
identity or lineage conflict requires operator investigation, not `--force-copy`.
Concurrent CLI migrations use an expiring Azure Blob lease. Do not perform a
manual state migration concurrently.
Automatic repository-state handling supports the default Terraform workspace
and literal Azure backend configurations.
It uses the repository's `.terraform` directory for backend metadata so migration
and subsequent applies use the same verified backend cache.

#### `spec`

Print the full CLI specification as JSON.

```bash
dx spec
```

This command is useful when you want to:

- Discover commands, arguments, and options programmatically
- Build automation or agentic workflows without scraping `--help` output
- Inspect the current CLI surface in a stable JSON format

**Example output:**

```json
{
  "name": "dx",
  "specVersion": "1",
  "version": "0.23.2",
  "commands": []
}
```

#### `info`

Display comprehensive information about your project setup and tools.

```bash
dx info
```

This command provides:

- Current project configuration details
- Installed tool versions
- Repository metadata
- Development environment information

### Global Options

These options are available on every subcommand:

- `--verbose, -v`: Enable verbose output. Lowers the log level to `debug` so that detailed progress information is emitted, and — when a command fails — prints the full error details, including the underlying `cause` chain and stack trace, instead of only the top-level message. Defaults to `false`.
- `--version, -V`: Display version number
- `--help, -h`: Display help information

**Example:**

```bash
# Re-run a failing command with full diagnostics
dx --verbose init project
```

## 🧪 Development

Run the CLI test suite from the repository root with:

```bash
pnpm nx test @pagopa/dx-cli
```

Some integration tests assert generated file contents with Vitest snapshots. When a generator change intentionally updates those files, refresh the snapshots with:

```bash
pnpm nx test @pagopa/dx-cli -- --update
```

Review the updated `__snapshots__` files before committing them.

---

<div align="center">

Made with ❤️ by the PagoPA DevEx Team

</div>
