# Azure Resource Analyzer CLI

This command-line interface (CLI) tool analyzes Azure resources in read-only mode to identify potential cost inefficiencies and underutilized resources. It does not modify, tag, or delete any resources; instead, it generates detailed reports to support FinOps decisions.

## Main Features

- **Multi-Subscription Analysis**: Scans multiple Azure subscriptions in a single command.
- **Intelligent Detection**: Uses Azure Monitor metrics (e.g., CPU, network traffic, transactions) to scientifically identify inactive resources.
- **Orphaned Resource Identification**: Detects commonly "forgotten" resources like unattached disks, unassociated public IPs, and unused network interfaces.
- **Flexible Reporting**: Offers multiple output formats:
  - `table`: A human-readable summary for the terminal.
  - `json` / `yaml`: Standard formats for integration with other tools.
  - `detailed-json`: A comprehensive output with all resource metadata, ideal for in-depth analysis via AI or custom scripts.
- **Simplified Configuration**: Supports configuration via files, command-line options, environment variables, or an interactive prompt.

## Prerequisites

1. **Node.js**: Version 16 or later.
2. **Azure Credentials**: The tool uses `DefaultAzureCredential`, which supports various authentication methods. The simplest way is to run `az login` from your terminal before launching the tool.
3. **Installation**:

```bash
pnpm install
```

## Usage

### Build the Project

First, compile the TypeScript code:

```bash
pnpm build
```

### Run the Tool

After building, you can run the tool using:

```bash
node dist/index.js [options]
```

Or if installed globally/as a binary:

```bash
azure-resource-analyzer [options]
```

For development with auto-rebuild:

```bash
pnpm dev
```

### Options

| Option       | Alias | Description                                               | Default      |
| :----------- | :---- | :-------------------------------------------------------- | :----------- |
| `--config`   | `-c`  | Path to a JSON configuration file.                        | N/A          |
| `--format`   | `-f`  | Report format (`table`, `json`, `yaml`, `detailed-json`). | `table`      |
| `--days`     | `-d`  | Metric analysis period in days.                           | `30`         |
| `--location` | `-l`  | Preferred Azure location for resources.                   | `italynorth` |

### Configuration Order

The script loads the configuration in the following priority order:

1. **Command-line options** (e.g., `--days 60`).
2. **Configuration file** (specified with `--config`).
3. **Environment variables** (`ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`).
4. **Interactive prompt** (if no other configuration is found).

### Configuration File Example (`config.json`)

This file allows you to pre-configure the most common parameters.

```json
{
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "subscriptionIds": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
  "preferredLocation": "italynorth",
  "timespanDays": 30
}
```

### Practical Examples

1. **Quick analysis with table output (default):**

   ```bash
   node dist/index.js
   ```

   _(You will be prompted for Tenant ID and Subscription ID if not otherwise configured)_

2. **Using a configuration file for a 60-day analysis:**

   ```bash
   node dist/index.js --config ./config.json
   ```

3. **Generating a detailed report for AI analysis:**

   ```bash
   node dist/index.js --format detailed-json > report_for_ai.json
   ```

4. **Analysis of the last 7 days with YAML output:**

   ```bash
   node dist/index.js --days 7 --format yaml
   ```

5. **Analysis focused on a specific location (`westeurope`):**

   ```bash
   node dist/index.js --location westeurope
   ```

## Development

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint        # Auto-fix issues
pnpm lint:check  # Check without fixing
```

### Testing

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### Formatting

```bash
pnpm format        # Format code
pnpm format:check  # Check formatting
```
