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

#### `savemoney`

Analyze CSP resources for cost optimization opportunities. Currently supports Azure, with AWS support planned for future releases.

##### Azure

Analyze Azure subscriptions to identify unused or underutilized resources that could be costing you money.

```bash
dx savemoney azure [options]
```

**Options:**

| Option       | Alias | Description                                                           | Default      |
| :----------- | :---- | :-------------------------------------------------------------------- | :----------- |
| `--config`   | `-c`  | Path to a JSON configuration file.                                    | N/A          |
| `--format`   | `-f`  | Report format (`table`, `json`, `detailed-json`).                     | `table`      |
| `--days`     | `-d`  | Metric analysis period in days.                                       | `30`         |
| `--location` | `-l`  | Preferred Azure location for resources.                               | `italynorth` |
| `--verbose`  | `-v`  | Enable verbose mode with detailed logging for each resource analyzed. | `false`      |

**Example usage:**

```bash
# Analyze with default settings (interactive prompts)
dx savemoney azure

# Use a configuration file
dx savemoney azure --config config.json

# Output as JSON with verbose logging
dx savemoney azure --format json --verbose

# Analyze with specific timespan
dx savemoney azure --days 60 --location italynorth
```

**Configuration file example (`config.json`):**

```json
{
  "tenantId": "your-tenant-id",
  "subscriptionIds": ["subscription-1", "subscription-2"],
  "preferredLocation": "italynorth",
  "timespanDays": 30
}
```

**Analyzed Azure resources:**

- **Virtual Machines**: Deallocated or stopped VMs, low CPU usage
- **Managed Disks**: Unattached disks
- **Network Interfaces**: Unattached NICs
- **Public IP Addresses**: Unassociated static IPs
- **Storage Accounts**: Low transaction counts
- **App Service Plans**: Empty plans or oversized tiers
- **Private Endpoints**: Unused or misconfigured endpoints

##### AWS (Coming Soon)

AWS support is planned for future releases with similar capabilities for analyzing AWS accounts and resources.

```bash
dx savemoney aws [options]
```

### Global Options

- `--version, -V`: Display version number
- `--help, -h`: Display help information

---

<div align="center">

Made with ❤️ by the PagoPA DevEx Team

</div>
