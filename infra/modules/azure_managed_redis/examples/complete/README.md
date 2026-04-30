# Azure Managed Redis - Complete Example

Minimal end-to-end usage of the `azure_managed_redis` module against an existing Resource Group, Virtual Network, and Log Analytics workspace.

## What it provisions

- A standalone Resource Group (`dx-d-itn-example-amr-rg-01`) that hosts the Managed Redis instance.
- An Azure Managed Redis instance with the `default` use case:
  - `Balanced_B3` SKU, HA enabled, system-assigned identity, Entra-only authentication.
  - Private endpoint on the supplied PEP subnet and `privatelink.redis.azure.net` DNS zone.
  - Diagnostic settings streaming to the supplied Log Analytics workspace.
  - The five built-in metric alerts (memory warn/critical, server load warn/critical, evicted keys) wired to the supplied action group. See the [Alerts section of the module README](../../README.md#alerts) for thresholds and rationale.

## Prerequisites

The example expects the following resources to already exist in the target subscription:

- A virtual network that hosts the DX-standard PEP subnet (`snet-<prefix>-<env>-pep-<loc>-01`) and whose resource group hosts the `privatelink.redis.azure.net` private DNS zone.
- A Log Analytics workspace.
- _(Optional)_ an action group to receive metric alerts.

Fill in the `null` values at the top of [`locals.tf`](./locals.tf) before running `terraform apply`.

## Usage

```bash
cd infra/modules/azure_managed_redis/examples/complete
terraform init
terraform plan
terraform apply
```

## Cleanup

```bash
terraform destroy
```
