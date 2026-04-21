# Azure Managed Redis - Complete Example

Minimal end-to-end usage of the `azure_managed_redis` module against an existing Resource Group, Virtual Network, and Log Analytics workspace.

## What it provisions

- A standalone Resource Group (`dx-d-itn-example-amr-rg-01`) that hosts the Managed Redis instance.
- An Azure Managed Redis instance with the `default` use case:
  - `Balanced_B3` SKU, HA enabled, system-assigned identity, Entra-only authentication.
  - Private endpoint on the supplied PEP subnet and `privatelink.redis.azure.net` DNS zone.
  - Diagnostic settings streaming to the supplied Log Analytics workspace.
  - The four built-in metric alerts with default thresholds, optionally wired to an action group.
- The `RedisJSON` and `RediSearch` modules enabled on the default database.

## Prerequisites

The example expects the following resources to already exist in the target subscription:

- A subnet dedicated to private endpoints (`subnet_pep_id`).
- A virtual network whose Resource Group hosts the `privatelink.redis.azure.net` private DNS zone.
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
