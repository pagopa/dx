# OpEx Dashboard

**Generate standardized Operational Excellence dashboards from OpenAPI 3
specifications.**

## Features

- **Automatic Dashboard Generation** - Parses OpenAPI 3 specs to create
  standardized operational dashboards
- **Multiple Cloud Providers** - Azure (current), AWS CloudWatch, Grafana
  (planned)
- **High Performance** - Parallel rendering with deterministic ordering
- **Type-Safe** - Full TypeScript with Zod runtime validation

OpEx Dashboard is distributed as an **npm package** with two components:

- **CLI tool** (`opex-dashboard`) - Command-line interface for end users
- **TypeScript library** - Programmatic API for integration

## Usage

```bash
npx @pagopa/opex-dashboard generate --help
```

### Local Development

```bash
git clone https://github.com/pagopa/dx.git
cd dx/apps/opex-dashboard-ts
pnpm install
pnpm run build
pnpm run dev
```

## Quick Start

### 1. Create Configuration File

```yaml
# config.yaml
oa3_spec: ./openapi.yaml # or HTTP URL
name: My API Dashboard
location: West Europe
resource_type: app-gateway
data_source: /subscriptions/xxx/resourceGroups/my-rg/providers/Microsoft.Network/applicationGateways/my-gtw
action_groups:
  - /subscriptions/xxx/resourceGroups/my-rg/providers/microsoft.insights/actionGroups/my-alerts
```

### 2. Generate Dashboard

```bash
# Output to stdout
npx @pagopa/opex-dashboard generate -t azure-dashboard-raw -c config.yaml

# Save as Terraform package
npx @pagopa/opex-dashboard generate -t azure-dashboard -c config.yaml --package ./output
```

### 3. Deploy with Terraform

```bash
cd output/azure-dashboard
terraform init -backend-config=env/dev/backend.tfvars
terraform apply -var-file=env/dev/terraform.tfvars
```

## Dashboard Components

For each endpoint in the OpenAPI spec, the dashboard includes:

### Graphs

1. **Availability**: HTTP success rate (status codes < 500)
2. **Response Codes**: Segmentation of all HTTP status codes (1XX, 2XX, 3XX,
   4XX, 5XX)
3. **Response Time**: 95th percentile response time

### Alarms

1. **Availability Alarm**: Triggers when availability drops below threshold
   (default: 99%)
2. **Response Time Alarm**: Triggers when response time exceeds threshold
   (default: 1 second)

### Configurable Parameters

For each alarm, you can configure:

- **Timespan** _(Default: 5m)_ - The aggregation window
- **Evaluation Frequency** _(Default: 10 minutes)_ - How often to evaluate the
  rule
- **Time Window** _(Default: 20 minutes)_ - Data fetch window (must be ≥
  evaluation frequency)
- **Event Occurrences** _(Default: 1)_ - Number of events needed to trigger
  alert

**NOTE:** Maximum event occurrences = time window ÷ timespan. For example, with
a 30m window and 5m timespan, max is 6 events.

## Usage

### CLI Commands

```bash
opex-dashboard generate [options]

Options:
  -t, --template-type <type>    Template type: azure-dashboard or azure-dashboard-raw (required)
  -c, --config <path>           Path to YAML config file, use - for stdin (required)
  --package [path]              Save as package in directory (default: current dir)
  -h, --help                    Display help
  -V, --version                 Display version
```

### Configuration

Create a YAML configuration file:

```yaml
# yaml-language-server: $schema=./config.schema.json
# Required fields
oa3_spec: string # Path or URL to OpenAPI 3 specification
name: string # Dashboard name
location: string # Azure region (e.g., "West Europe")
data_source: string # Azure resource ID
action_groups: string[] # Array of Azure Action Group IDs

# Optional fields (with defaults)
resource_type: app-gateway | api-management # Default: app-gateway
timespan: string # Default: 5m
evaluation_frequency: integer # Default: 10 (minutes)
evaluation_time_window: integer # Default: 20 (minutes)
event_occurrences: integer # Default: 1
availability_threshold`: float # Default: 0.99 (99%)
response_time_threshold: float # Default: 1.0 second

# When generating Terraform packages (using `--package` option),
# you can optionally configure environment-specific settings
terraform:
  environments:
    dev:
      prefix: string # Max 6 chars (required)
      env_short: string # Max 1 char: 'd', 'u', 'p' (required)
      backend: # Optional backend state configuration
        resource_group_name: string
        storage_account_name: string
        container_name: string
        key: string
    uat: # Similar to dev
    prod: # Similar to dev
```

See [`examples/`](./examples) directory for complete configuration samples.

#### JSON Schema Validation

A JSON Schema is automatically generated from the TypeScript types and included
at [`config.schema.json`](./config.schema.json). This enables IDE autocomplete
and validation for your configuration files.

To enable schema validation in VS Code and other compatible editors, add this
comment at the top of your YAML configuration file:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/apps/opex-dashboard-ts/config.schema.json
```

The schema is:

- **Automatically generated** during build from Zod schemas using
  `pnpm run build`
- **Synchronized** with TypeScript types - any changes to configuration
  structure are reflected immediately
- **Versioned** - matches the package version for compatibility tracking
- **Distributed** with the npm package for programmatic access

## CI/CD Integration

### Using the GitHub Workflow from Another Repository

You can use the reusable workflow to automate dashboard generation in your own
repository. Create a `.github/workflows/generate-dashboard.yml` file in your
repo:

```yaml
name: Generate Dashboard

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  generate:
    uses: pagopa/dx/.github/workflows/generate.yml@main
    with:
      # mandatory inputs:
      config_path: ./config/dashboard-config.yaml
      output_dir: ./generated
      # optional inputs with defaults:
      pr_title: "Update operational dashboard"
      pr_body: "Automated update of dashboard terraform from OpenAPI spec"
      base_branch: main
```

This workflow will:

1. Generate the dashboard using your configuration
2. Commit changes to a new branch
3. Create a pull request for review

### Workflow Inputs

- `config_path` (required): Path to your YAML configuration file
- `output_dir` (required): Directory to save generated files
- `template_type` (optional): Template type (`azure-dashboard` or
  `azure-dashboard-raw`, default: `azure-dashboard`)
- `pr_title` (optional): Title for the generated pull request
- `pr_body` (optional): Description for the generated pull request
- `base_branch` (optional): Base branch for the pull request (default: `main`)

## Development

### Setup

```bash
pnpm install
pnpm run build
```

### Scripts

```bash
pnpm run build                  # Bundle with tsup (ESM output)
pnpm run dev                    # Watch mode for development
pnpm run typecheck              # TypeScript compilation check
pnpm test                       # Run all tests (unit + integration)
pnpm run test:coverage          # Coverage report (80% thresholds)
pnpm run test:unit              # Unit tests only
pnpm run test:integration       # Integration tests only
pnpm run test:watch             # TDD watch mode
pnpm run lint                   # ESLint with auto-fix
pnpm run lint:check             # Lint check only
pnpm run format                 # Prettier format
pnpm run format:check           # Format check only
```

### Testing

The project includes comprehensive unit and integration tests with Vitest:

- **Unit Tests** (`test/unit/`) - Test individual functions and components
- **Integration Tests** (`test/integration/`) - Test end-to-end workflows

Run tests with automatic cleanup:

```bash
pnpm test                 # Run all tests
pnpm run test:coverage    # Run with coverage report
pnpm run test:watch       # Watch mode for TDD
```

Tests automatically:

- Clean up temporary directories after each test
- Use unique temp directories to avoid conflicts
- Validate outputs against existing fixtures

### Code Quality

```bash
pnpm run lint                  # ESLint with auto-fix
pnpm run lint:check            # Lint check only
pnpm run format                # Prettier format
pnpm run format:check          # Format check only
pnpm run typecheck             # TypeScript compilation check
```

### Code Style

- TypeScript strict mode enabled
- No `any` types - Use `unknown` with type guards
- Small focused files (< 200 lines)
- Zod validation for runtime safety
- File headers explaining module purpose
- Colocated schemas (`*.schema.ts`)
