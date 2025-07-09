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

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/pagopa/dx.git
cd dx

# Install dependencies
yarn install

# Build the CLI
yarn build

# Run the CLI
node ./apps/cli/bin/index.js --help
```

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

### Global Options

- `--version, -V`: Display version number
- `--help, -h`: Display help information

---

<div align="center">

Made with ❤️ by the PagoPA DevEx Team

</div>
