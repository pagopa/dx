---
sidebar_position: 2
title: SaveMoney - Cost Optimization
description: Analyze cloud resources to identify cost optimization opportunities
---

The SaveMoney tool helps identify underutilized and unused cloud resources that
may be costing your organization money. It performs read-only analysis across
your cloud infrastructure, generating actionable reports to support FinOps
decisions without modifying any resources.

## Overview

SaveMoney scans your cloud subscriptions using provider APIs and metrics to
scientifically detect:

- **Inactive Resources** - VMs, storage, and services with minimal usage
- **Orphaned Resources** - Unattached disks, unused IPs, and dangling network
  interfaces
- **Oversized Resources** - Services running on unnecessarily expensive tiers
- **Misconfigured Resources** - Resources in wrong regions or missing management
  tags

All analysis is performed in **read-only mode** - the tool never modifies, tags,
or deletes resources.

## Supported Cloud Providers

### ✅ Azure

Full support for Azure resource analysis with intelligent detection algorithms
based on Azure Monitor metrics and resource states.

### 🚧 AWS (Planned)

AWS support is planned for future releases with similar capabilities.

## Quick Start

```bash
# Interactive mode (prompts for configuration)
npx @pagopa/dx-cli savemoney

# Using configuration file
npx @pagopa/dx-cli savemoney --config config.json

# With verbose output and JSON format
npx @pagopa/dx-cli savemoney --config config.json --format json --verbose
```

## Architecture

The SaveMoney tool follows a modular architecture designed for multi-CSP
support:

```mermaid
flowchart LR
    subgraph cli["CLI Layer"]
        CMDs[other cmds]
        CLI[savemoney]
    end

    subgraph pkg["Package Layer - @pagopa/dx-savemoney"]
        Config[Config Loader]
        Azure[Azure Analyzer]
        AWS[AWS Analyzer<br/>Coming Soon...]
    end

    subgraph svc["Azure Services"]
        ARM[Azure Resource Manager]
        Monitor[Azure Monitor Metrics]
        Identity[Azure Identity]

        %% Icons
        Monitor@{ icon: "azure:metrics" }
        %% Identity@{ icon: "azure:managed-identities" }
        %% ARM@{ icon: "azure:resources-provider" }
    end

    subgraph rsc["Azure Resources"]
        direction LR
        VM[Virtual Machines]
        Disk[Managed Disks]
        NIC[Network Interfaces]
        IP[Public IPs]
        ASP[App Service Plans]
        PE[Private Endpoints]
        SA[Storage Accounts]

        %% Icons
        %% VM@{ icon: "azure:virtual-machine" }
        %% Disk@{ icon: "azure:disks" }
        %% NIC@{ icon: "azure:network-interfaces" }
        %% IP@{ icon: "azure:public-ip-addresses" }
        %% ASP@{ icon: "azure:app-service-plans" }
        %% PE@{ icon: "azure:private-endpoints" }
        %% SA@{ icon: "azure:storage-accounts" }
    end

    CLI --> Config
    Config --> Azure
    Config -.-> AWS

    Azure --> ARM
    Azure --> Monitor
    Azure --> Identity

    ARM --> rsc
    Monitor --> rsc


    style CLI fill:#0078d4,color:#fff
    style Azure fill:#0078d4,color:#fff
    style AWS fill:#ccc,color:#666
    style Config fill:#107c10,color:#fff
```

## Analysis Flow

The tool follows a systematic approach to analyze resources:

<details>
<summary>See the Diagram</summary>

```mermaid
flowchart TB
    Start([Start]) --> LoadConfig[Load Configuration<br/>&<br/>Authenticate with CSP]
    LoadConfig --> ForEachSub{For Each<br/>Subscription}

    ForEachSub --> ListRes[List All Resources]
    ListRes --> Analyze[Analyze Resource]
    Analyze --> CheckState[Check State, Metrics, Tags, Location]
    CheckState --> Risk[Calculate Cost Risk]

    Risk --> MoreRes{More<br/>Resources?}
    MoreRes -->|Yes| Analyze

    MoreRes -->|No| MoreSubs{More<br/>Subscriptions?}
    MoreSubs -->|Yes| ForEachSub

    MoreSubs -->|No| Report[Generate Report]
    Report --> End([End])

    style Start fill:#107c10,color:#fff
    style End fill:#107c10,color:#fff
    style Analyze fill:#ffa500,color:#fff
    style Risk fill:#d13438,color:#fff
    style Report fill:#5c2d91,color:#fff
```

</details>

## Configuration

### Authentication

The tool uses Azure's `DefaultAzureCredential`, supporting multiple
authentication methods:

- **Azure CLI** - `az login` (recommended for local development)
- **Managed Identity** - Automatic in Azure environments

### Configuration Parameters

| Parameter           | Type       | Required | Default      | Description                                        |
| :------------------ | :--------- | :------: | :----------- | :------------------------------------------------- |
| `tenantId`          | `string`   |    ✅    | N/A          | Azure Active Directory Tenant ID                   |
| `subscriptionIds`   | `string[]` |    ✅    | N/A          | Array of Azure subscription IDs to scan            |
| `preferredLocation` | `string`   |    ❌    | `italynorth` | Preferred Azure region (flags misplaced resources) |
| `timespanDays`      | `number`   |    ❌    | `30`         | Days to look back for metrics analysis             |
| `verbose`           | `boolean`  |    ❌    | `false`      | Enable detailed logging per resource               |

### Configuration File Example

Create a `config.json` file:

```json
{
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "subscriptionIds": [
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
  ],
  "preferredLocation": "italynorth",
  "timespanDays": 30
}
```

### Environment Variables

Alternatively, use environment variables:

```bash
export ARM_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export ARM_SUBSCRIPTION_ID="sub-1,sub-2,sub-3"
```

:::tip

If **required** configuration parameters are not provided via file or CLI
options, the tool will ask them interactively.

:::

## Analyzed Azure Resources

The tool analyzes the following Azure resource types for potential cost
optimization:

| Resource Type       | Risk | What It Detects                                    | Key Detection Criteria                                                                   |
| :------------------ | :--: | :------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| Virtual Machines    |  🔴  | VMs that are deallocated or severely underutilized | • Deallocated/stopped state<br/>• CPU < 1%<br/>• Network traffic < 10 MB                 |
| App Service Plans   |  🔴  | Empty or underutilized plans (especially Premium)  | • No apps deployed<br/>• CPU < 5%<br/>• Memory < 10%<br/>• Premium tier with no workload |
| Managed Disks       |  🟡  | Unattached disks incurring storage costs           | • Disk state is "Unattached"<br/>• No `managedBy` property                               |
| Public IP Addresses |  🟡  | Unused static IPs that continue billing            | • Not associated with any resource<br/>• Static allocation<br/>• Network traffic < 1 MB  |
| Network Interfaces  |  🟡  | NICs not attached to VMs or Private Endpoints      | • Not attached to VM<br/>• Not associated with Private Endpoint<br/>• No public IP       |
| Private Endpoints   |  🟡  | Misconfigured or unused Private Endpoints          | • No private link connections<br/>• All connections rejected/disconnected<br/>• No NICs  |
| Storage Accounts    |  🟡  | Storage accounts with minimal activity             | • Transaction count < 100 over timespan                                                  |

**Risk Levels:** 🔴 High · 🟡 Medium · 🟢 Low

### Cross-Resource Checks

All resources are additionally evaluated for:

- **Missing Tags** - Resources without tags may be unmanaged or orphaned
- **Location Mismatch** - Resources outside preferred region may have compliance
  or cost implications

## Output Formats

### Table Format (Default)

Human-readable console table output ideal for quick inspection:

```bash
npx @pagopa/dx-cli savemoney --config config.json --format table
```

**Example Output:**

```text
INF savemoney·azure Analyzing subscription: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
┌─────────┬──────────────────────────────┬─────────────────────────┬────────────────────┬──────────┬────────┬─────────────────────────────────────┐
│ (index) │ Name                         │ Type                    │ Resource Group     │ Risk     │ Unused │ Reason                              │
├─────────┼──────────────────────────────┼─────────────────────────┼────────────────────┼──────────┼────────┼─────────────────────────────────────┤
│ 0       │ 'ex12345'                    │ 'Microsoft.Storage/...' │ 'dx-d-weu-tes...'  │ 'medium' │ 'Yes'  │ 'Resource not in preferred loca...' │
│ 1       │ 'dx-d-itn-example-kv-pep-02' │ 'Microsoft.Network/...' │ 'dx-d-itn-exa...'  │ 'medium' │ 'Yes'  │ 'No tags found.'                    │
│ 2       │ 'dxditnexampleteststfn05'    │ 'Microsoft.Storage/...' │ 'dx-d-itn-mod...'  │ 'medium' │ 'Yes'  │ 'Very low transaction count (0).'   │
└─────────┴──────────────────────────────┴─────────────────────────┴────────────────────┴──────────┴────────┴─────────────────────────────────────┘
```

### JSON Format

Structured JSON array output for integration with other tools:

```bash
npx @pagopa/dx-cli savemoney --config config.json --format json
```

**Example Output:**

```json
[
  {
    "costRisk": "medium",
    "location": "westeurope",
    "name": "ex12345",
    "reason": "Very low transaction count (0). Resource not in preferred location (italynorth).",
    "resourceGroup": "dx-d-weu-test-rg-01",
    "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "suspectedUnused": true,
    "type": "Microsoft.Storage/storageAccounts"
  },
  {
    "costRisk": "medium",
    "location": "italynorth",
    "name": "dx-d-itn-example-kv-pep-02",
    "reason": "No tags found.",
    "resourceGroup": "dx-d-itn-example-rg-01",
    "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "suspectedUnused": true,
    "type": "Microsoft.Network/privateEndpoints"
  }
]
```

### Detailed JSON Format

Complete output including full Azure resource metadata for AI analysis:

```bash
npx @pagopa/dx-cli savemoney --config config.json --format detailed-json
```

## Command-Line Options

| Option              | Alias | Type      | Description                                     |
| :------------------ | :---- | :-------- | :---------------------------------------------- |
| `--config <path>`   | `-c`  | `string`  | Path to JSON configuration file                 |
| `--format <format>` | `-f`  | `string`  | Output format: `table`, `json`, `detailed-json` |
| `--location <loc>`  | `-l`  | `string`  | Preferred Azure location                        |
| `--days <number>`   | `-d`  | `number`  | Metric analysis timespan in days                |
| `--verbose`         | `-v`  | `boolean` | Enable detailed logging per resource            |

## Usage Examples

### Basic Analysis

```bash
# Interactive mode - prompts for configuration
npx @pagopa/dx-cli savemoney

# Using config file
npx @pagopa/dx-cli savemoney --config azure-config.json
```

### Custom Timespan

```bash
# Analyze last 60 days instead of default 30
npx @pagopa/dx-cli savemoney --config config.json --days 60
```

### Verbose Mode for Debugging

```bash
# See detailed analysis for each resource
npx @pagopa/dx-cli savemoney --config config.json --verbose
```

**Verbose Output Example:**

```txt
INF savemoney·azure Analyzing subscription: prod-001
DBG savemoney·azure·verbose
================================================================================
🔍 ANALYZING: vm-test-001
   Type: Virtual Machine (Microsoft.Compute/virtualMachines)
================================================================================
DBG savemoney·azure·verbose Resource details:
  ...
}
📊 ANALYSIS RESULT:
   Cost Risk: HIGH
   Suspected Unused: YES
   Reason: VM is deallocated
================================================================================
```

## ✅ Best Practices

- **Run Regularly** - Schedule weekly or monthly analysis to catch cost drift
  early
- **Start with Table Format** - Use for quick visual inspection before deeper
  analysis
- **Review Before Action** - Always validate findings before deleting resources
- **Use Verbose Mode** - When investigating unexpected results or debugging
- **Check Metrics Timespan** - Longer timespans (60-90 days) provide more
  accurate usage patterns
- **Combine with Tags** - Tag resources properly to avoid false positives
- **Document Decisions** - Keep records of why resources are kept or removed

## ⚠️ Limitations

- **Read-Only Analysis** - Does not modify, tag, or delete resources
- **Metrics Availability** - Some resources may have limited historical metrics
- **Cost Estimates** - Does not calculate actual cost savings (focuses on risk
  level)
- **Context Required** - Some flagged resources may be intentionally idle (e.g.,
  test environments)

## Troubleshooting

### Authentication Errors

```bash
# Ensure Azure CLI is logged in
az login

# Verify subscription access
az account list --output table

# Check your current subscription
az account show
```

### No Resources Found

- Verify subscription IDs in configuration
- Check Azure RBAC permissions (Reader role minimum required)
- Ensure resources exist in the subscriptions

### Metrics Not Available

Some resources may not have historical metrics if:

- The resource was recently created
- Metrics collection is disabled
- Insufficient permissions to access Monitor data

### False Positives

Resources flagged as unused may be:

- Intentionally idle (disaster recovery, staging)
- Scheduled workloads (batch processing)
- Development/testing environments

**Solution:** Use tags to mark resources as "keep" or document special cases.
