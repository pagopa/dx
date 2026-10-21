---
title: SaveMoney
sidebar_position: 1
description: Find Azure resources and recommendations worth reviewing for cost savings.
---

# SaveMoney

SaveMoney helps teams find Azure resources that may be unused, underused, or
worth reviewing based on Azure Advisor recommendations. It is useful for
regular cost reviews and for investigating possible resource waste.

Analysis is read-only: SaveMoney does not change, stop, tag, or delete
resources. Its findings are prompts for review, not instructions to take
action. Azure is the supported provider.

## Before you start

The CLI requires Node.js 22 or later. Install it with:

```bash
npm install --global @pagopa/dx-savemoney
```

Sign in with `az login`, or use a managed identity or another credential
supported by the Azure SDK. Grant that identity at least the **Reader** role
on the subscriptions to analyze. Some environments also require additional
read access to Azure Monitor metrics or Advisor recommendations.

## Run an analysis

Start with a table for one or more subscriptions:

```bash
savemoney analyze --subscriptionIds <subscription-id> --format table
savemoney analyze --subscriptionIds <subscription-id-1> <subscription-id-2>
```

To discover all current options and valid values, run
`savemoney analyze --help`.

### Select findings

By default, SaveMoney combines its resource checks with cost recommendations
from Azure Advisor. Use `--source custom` for resource checks alone,
`--source advisor` for Advisor alone, or `--source all` for both.

Tag filters apply to resource-level findings; resources must match **all**
specified tags:

```bash
savemoney analyze --subscriptionIds <subscription-id> \
  --tags environment=production team=platform
```

Azure Advisor recommendations for the subscription as a whole remain global
even when a tag filter is used. Missing tags are shown as a governance note on
resources already reported for another reason; missing tags alone do not add
resources to the report.

### Options commonly used

| Option                                      | Use                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `--subscriptionIds <ids...>`                | Choose one or more subscriptions.                                   |
| `--config <path>`                           | Load settings from a YAML file.                                     |
| `--format table\|json\|detailed-json\|lint` | Choose a terminal, JSON, or lint-style report. Defaults to `table`. |
| `--days <days>`                             | Change the metrics lookback period. Defaults to 30 days.            |
| `--location <region>`                       | Set the preferred region. Defaults to `italynorth`.                 |
| `--source advisor\|custom\|all`             | Choose which findings to include. Defaults to both sources.         |
| `--tags <key=value...>`                     | Filter resource-level findings by tags.                             |
| `--azqr-report <path>`                      | Add findings from an AZQR JSON report.                              |
| `--no-pricing`                              | Skip Retail Prices API lookups for custom findings.                 |
| `--verbose`                                 | Show additional diagnostic logs.                                    |

### Configuration

Subscription IDs can be supplied with `--subscriptionIds`, in YAML, or with
the comma-separated `ARM_SUBSCRIPTION_ID` environment variable. If none are
available, SaveMoney prompts in a terminal; when stdin is not a terminal, it
fails instead of waiting for input. For subscription IDs, precedence is CLI,
YAML, environment, then prompt. For other settings, CLI options override YAML
and built-in defaults fill values that are not specified.

Example `config.yaml`:

```yaml
azure:
  subscriptionIds:
    - <subscription-id>
  preferredLocation: italynorth
  timespanDays: 30
  thresholds:
    vm:
      cpuPercent: 5
    storage:
      transactionsPerDay: 50
```

Use it with:

```bash
savemoney analyze --config config.yaml --format json
```

You can omit `subscriptionIds` from YAML when providing them through the CLI
or environment. Thresholds can be adjusted for supported resource checks;
specify only the values to change and the remaining values keep their defaults.

## What it finds

SaveMoney checks resource state and available usage metrics. It can report:

| Resource or source                               | Examples of findings                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Virtual machines and App Service plans           | Deallocated or empty resources, or very low CPU/memory use.                             |
| Container Apps and Static Web Apps               | Not running, no replicas, or very low usage/traffic.                                    |
| Managed disks, public IPs, and network resources | Unattached disks, unassociated IPs, or unused network interfaces and private endpoints. |
| Storage accounts                                 | Very low transaction activity.                                                          |
| Azure Advisor                                    | Cost recommendations such as right-sizing, Reserved Instances, and Savings Plans.       |
| AZQR report                                      | Relevant billable orphans and free cleanup candidates.                                  |

Resources outside the preferred location may also receive a governance
observation. Metrics can be unavailable for some resource types or
subscriptions; a missing metric is not proof that a resource is unused.

## Add an AZQR report

SaveMoney can include relevant findings from an
[AZQR](https://github.com/Azure/azqr) JSON report alongside a live analysis:

```bash
azqr scan --subscription-id <subscription-id> --json --mask=false
savemoney analyze --subscriptionIds <subscription-id> \
  --azqr-report ./azqr_action_plan.json
```

Use `--mask=false` so AZQR resource IDs can be matched to Azure resources.
SaveMoney imports cost-related findings and selected orphaned-resource
cleanup candidates; other AZQR categories are not included. Duplicate findings
are combined, and AZQR does not provide a cost estimate. Only rows whose
`resourceId` belongs to a subscription selected for the SaveMoney analysis are
included; the `resourceId` determines scope even if AZQR's `subscriptionId`
field disagrees. Resources from those subscriptions can be included even when
the live analysis did not find them. Rows with masked or unrecognizable
subscription IDs are skipped.

## Understand the results

Choose a format based on how you will use the report:

| Format          | What it shows                                                    |
| --------------- | ---------------------------------------------------------------- |
| `table`         | A readable terminal summary; this is the default.                |
| `json`          | A JSON array of resource summaries.                              |
| `detailed-json` | A JSON array with additional Azure resource details.             |
| `lint`          | Findings grouped by resource with risk indicators and a summary. |

Example JSON summary:

```json
[
  {
    "costRisk": "medium",
    "location": "westeurope",
    "name": "storage-example",
    "reason": "Very low transaction count (0).",
    "resourceGroup": "example-rg",
    "subscriptionId": "<subscription-id>",
    "suspectedUnused": true,
    "type": "Microsoft.Storage/storageAccounts"
  }
]
```

Custom findings may include an estimated monthly **cost at risk** for
supported resource types. It is a list-price estimate of cost that might be
avoided if a resource is no longer needed—not a guaranteed saving. Azure
Advisor may report its own estimated monthly savings; those are separate
from custom cost-at-risk estimates. Estimates may be unavailable.

For scripts, `json` and `detailed-json` write the result array to stdout;
progress and errors go to stderr. Exit code `0` indicates success and `1`
indicates an error. Check the exit code and error output: empty stdout alone
does not mean there were no findings.

## Limitations and troubleshooting

- Review findings with the resource owner before making changes. Scheduled,
  staging, and disaster-recovery resources can be intentionally idle.
- Cost estimates cover selected resource types and may not reflect discounts,
  reservations, actual billing, or workload dependencies.
- Recent resources, unavailable metrics, or missing read permissions can
  reduce the evidence available for a finding.
- For authentication errors, run `az login` and confirm access with
  `az account list --output table`.
- If no findings appear, check the subscription IDs, Reader access, resource
  existence, and access to the required metrics and Advisor data.
