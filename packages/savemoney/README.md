# DX Save Money

A TypeScript library for analyzing CSP resources to identify potential cost inefficiencies and underutilized resources. It operates in read-only mode and does not modify, tag, or delete any resources; instead, it generates detailed reports to support FinOps decisions.

## Azure

### Main Features

- **Multi-Subscription Analysis**: Scans multiple Azure subscriptions in a single command.
- **Intelligent Detection**: Uses Azure Monitor metrics (e.g. CPU, network traffic, transactions) to scientifically identify inactive resources.
- **Orphaned Resource Identification**: Detects commonly "forgotten" resources like unattached disks, unassociated public IPs, and unused network interfaces.
- **Flexible Reporting**: Offers multiple output formats:
  - `table`: A human-readable summary for the terminal.
  - `json`: Standard format for integration with other tools.
  - `detailed-json`: A comprehensive output with all resource metadata, ideal for in-depth analysis via AI or custom scripts.
- **Simplified Configuration**: Supports configuration via files, command-line options, environment variables, or an interactive prompt.

### Analyzed Resources

The tool analyzes the following Azure resource types with specific detection methods and risk levels:

| Resource Type           | Detection Method        | Cost Risk | What's Checked                                                                          |
| :---------------------- | :---------------------- | :-------: | :-------------------------------------------------------------------------------------- |
| **Virtual Machines**    | Instance View + Metrics |  🔴 High  | Deallocated/stopped state, Low CPU usage (<1%), Low network traffic (<10MB)             |
| **App Service Plans**   | API Details + Metrics   |  🔴 High  | No apps deployed, Very low CPU (<5%), Very low memory (<10%), Oversized Premium tier    |
| **Managed Disks**       | API Details             | 🟡 Medium | Unattached state, No `managedBy` property                                               |
| **Public IP Addresses** | API Details + Metrics   | 🟡 Medium | Not associated with any resource, Static IP not in use, Very low network traffic (<1MB) |
| **Network Interfaces**  | API Details             | 🟡 Medium | Not attached to VM or Private Endpoint, No public IP assigned                           |
| **Private Endpoints**   | API Details             | 🟡 Medium | No private link connections, Rejected/disconnected connections, No network interfaces   |
| **Storage Accounts**    | Metrics                 | 🟡 Medium | Very low transaction count (<100 in timespan)                                           |

#### Generic Checks

All resources are also checked for:

- **Missing tags**: Resources without tags are flagged as potentially unmanaged
- **Location mismatch**: Resources not in the preferred location are reported

## Prerequisites

1. **Node.js**: Version 22 or higher.
2. **Azure Credentials**: The library uses `DefaultAzureCredential` from `@azure/identity`, which supports various authentication methods:
   - Azure CLI (`az login`)
   - Managed Identity
   - Environment variables
   - Visual Studio Code
   - And more...

## Installation

```bash
npm install @pagopa/dx-savemoney
# or
pnpm add @pagopa/dx-savemoney
# or
yarn add @pagopa/dx-savemoney
```

## Usage

This package provides a TypeScript/JavaScript API for analyzing Azure resources programmatically.

### Quick Start

```typescript
import { azure, loadConfig } from "@pagopa/dx-savemoney";

// Load configuration (from file, env vars, or interactive prompt)
const config = await loadConfig("./config.json");

// Run analysis and generate report
await azure.analyzeAzureResources(config, "table");
```

### Configuration Inputs

The tool requires the following configuration:

| Input               | Type       | Required | Default      | Description                                                  |
| :------------------ | :--------- | :------: | :----------- | :----------------------------------------------------------- |
| `tenantId`          | `string`   |    ✅    | -            | Azure Active Directory Tenant ID                             |
| `subscriptionIds`   | `string[]` |    ✅    | -            | Array of Azure subscription IDs to analyze                   |
| `preferredLocation` | `string`   |    ❌    | `italynorth` | Preferred Azure region (resources elsewhere will be flagged) |
| `timespanDays`      | `number`   |    ❌    | `30`         | Number of days to look back for metrics analysis             |
| `verbose`           | `boolean`  |    ❌    | `false`      | Enable detailed logging for each resource analyzed           |

### Output Formats

The tool supports multiple output formats for different use cases:

| Format          | Description                                     | Use Case                       |
| :-------------- | :---------------------------------------------- | :----------------------------- |
| `table`         | Human-readable table in terminal                | Quick visual inspection        |
| `json`          | Structured JSON with resource summaries         | Integration with other tools   |
| `detailed-json` | Complete JSON with full Azure resource metadata | AI analysis or deep inspection |

### How to Load Configuration

The `loadConfig()` function loads configuration in the following priority order:

1. **Configuration file** (pass file path as parameter)
2. **Environment variables** (`ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`)
3. **Interactive prompt** (if no other configuration is found)

**Example:**

```typescript
// From file
const config1 = await loadConfig("./config.json");

// From environment variables or prompt
const config2 = await loadConfig();
```

### Configuration File Example (`config.json`)

```json
{
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "subscriptionIds": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
  "preferredLocation": "italynorth",
  "timespanDays": 30,
  "verbose": false
}
```

### Usage Examples

#### Basic Usage

```typescript
import { azure, loadConfig } from "@pagopa/dx-savemoney";

// Load from config file
const config = await loadConfig("./config.json");
await azure.analyzeAzureResources(config, "table");
```

#### Custom Configuration

```typescript
import { azure } from "@pagopa/dx-savemoney";
import type { AzureConfig } from "@pagopa/dx-savemoney";

const config: AzureConfig = {
  tenantId: "your-tenant-id",
  subscriptionIds: ["sub-id-1", "sub-id-2"],
  preferredLocation: "italynorth",
  timespanDays: 30,
  verbose: true,
};

await azure.analyzeAzureResources(config, "json");
```

#### Generate Detailed Report

```typescript
import { azure, loadConfig } from "@pagopa/dx-savemoney";

const config = await loadConfig();
// Generate detailed JSON with full resource metadata
await azure.analyzeAzureResources(config, "detailed-json");
```

#### Using Environment Variables

```typescript
import { loadConfig, azure } from "@pagopa/dx-savemoney";

// Set environment variables
// ARM_TENANT_ID=xxx
// ARM_SUBSCRIPTION_ID=sub1,sub2

const config = await loadConfig(); // Will read from env vars
await azure.analyzeAzureResources(config, "json");
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
