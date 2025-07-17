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

- **Repository Validation**: Verify repository setup against DevEx guidelines
- **Monorepo Script Checking**: Validate that required scripts are present in package.json
- **Developer Experience Optimization**: Ensure consistent development practices across projects

## 🚀 Installation

> [!NOTE]
> The CLI is currently only available locally and is not yet distributed through package managers.

### Requirements

- Node.js >=22.0.0
- pnpm (recommended package manager)

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/pagopa/dx.git
cd dx

# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Run the CLI
node ./apps/cli/bin/index.js --help
```

## 🛠️ Usage

### Available Commands

#### `doctor`

Verify the repository setup according to the DevEx guidelines.

```bash
node ./apps/cli/bin/index.js doctor
```

This command will:

- Check if you're in a valid Git repository
- Validate that required monorepo scripts are present in package.json
- Check that the `turbo.json` file exists
- Verify that the installed `turbo` version meets the minimum requirements

**Example output:**

```bash
$ node ./apps/cli/bin/index.js doctor
09:36:53.748 INF dx-cli·doctor Checking pre-commit configuration...
09:36:53.750 INF dx-cli·validation ✅ Pre-commit configuration is present in the repository root
09:36:53.750 INF dx-cli·doctor Checking Turbo configuration...
09:36:53.753 INF dx-cli·validation ✅ Turbo configuration is present in the monorepo root and turbo dependency is installed
09:36:53.753 INF dx-cli·doctor Checking monorepo scripts...
09:36:53.754 INF dx-cli·validation ✅ Monorepo scripts are correctly set up
```

### Global Options

- `--version, -V`: Display version number
- `--help, -h`: Display help information

---

<div align="center">

Made with ❤️ by the PagoPA DevEx Team

</div>
