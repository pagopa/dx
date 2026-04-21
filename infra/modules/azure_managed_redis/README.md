# DX - Azure Managed Redis

This module provisions [Azure Managed Redis](https://learn.microsoft.com/azure/redis/overview) (AMR) with opinionated PagoPA DX defaults: Entra-only data-plane authentication, private networking, diagnostics wired to Log Analytics, and metric alerts with sensible thresholds.

## Features

- Three `use_case` presets that drive SKU, HA, persistence, diagnostics, alerts, lock, and public/private networking.
- Microsoft Entra authentication only. Access keys are permanently disabled on the default database.
- System-assigned managed identity, provisioned automatically.
- Private endpoint on the `redisEnterprise` subresource with DNS integration via `privatelink.redis.azure.net` (for the `default` and `high_throughput` use cases).
- Diagnostic settings streaming `allLogs` and `AllMetrics` to a Log Analytics workspace.
- Four built-in metric alerts (used memory %, connected clients, server load, cache misses) with sensible default thresholds.
- Management lock (`CanNotDelete`) on all non-development instances.
- Typed configuration for the default database (protocol, clustering policy, eviction policy, modules).

## Use cases

| Use case          | SKU                    | HA       | Public network | Persistence | Diagnostics | Alerts   | Lock     |
| ----------------- | ---------------------- | -------- | -------------- | ----------- | ----------- | -------- | -------- |
| `default`         | `Balanced_B3`          | Enabled  | Disabled       | RDB `1h`    | Enabled     | Enabled  | Enabled  |
| `development`     | `Balanced_B0`          | Disabled | Enabled        | Disabled    | Disabled    | Disabled | Disabled |
| `high_throughput` | `ComputeOptimized_X3`  | Enabled  | Disabled       | RDB `1h`    | Enabled     | Enabled  | Enabled  |

## Usage

```hcl
module "managed_redis" {
  source = "pagopa-dx/azure-managed-redis/azurerm"

  environment = {
    prefix          = "dx"
    env_short       = "p"
    location        = "italynorth"
    domain          = "payments"
    app_name        = "cache"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags

  use_case = "default"

  subnet_pep_id = azurerm_subnet.pep.id
  virtual_network = {
    name                = data.azurerm_virtual_network.core.name
    resource_group_name = data.azurerm_virtual_network.core.resource_group_name
  }

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.this.id

  database = {
    modules = [
      { name = "RedisJSON" },
      { name = "RediSearch" }
    ]
  }
}
```

## Key defaults

- **Authentication:** Entra-only. Data-plane access policy assignments are the consumer's responsibility; use the `id` and `principal_id` outputs to wire them externally.
- **Networking:** private by default (`default`, `high_throughput`). `development` provisions a public-only instance to simplify local iterations.
- **DNS zone:** the `privatelink.redis.azure.net` private DNS zone is resolved from the provided `virtual_network.resource_group_name` unless `private_dns_zone_resource_group_name` is set.
- **Persistence:** RDB with a `1h` frequency. AOF is not supported by this module.
- **Port:** the default database listens on port `10000`.

## Unsupported on purpose

These features are intentionally left out of v0.x to keep the surface small. They will be re-introduced incrementally, tracked as follow-ups under [CES-1909](https://pagopa.atlassian.net/browse/CES-1909):

- Customer-managed keys and user-assigned identities.
- Geo-replication (`azurerm_managed_redis_geo_replication`). Consume the `id` output to wire it externally.
- `authorized_teams` RBAC helper. Use `azure_role_assignments` or `azurerm_managed_redis_access_policy_assignment` directly.

## Examples

- [`examples/complete`](./examples/complete): minimal end-to-end usage wired against an existing Resource Group, VNet, and Log Analytics workspace.
- [`examples/network_access`](./examples/network_access): public vs. private use-case comparison used by the e2e suite.

## Testing

```bash
pnpm nx run azure_managed_redis:test:unit
pnpm nx run azure_managed_redis:test:contract
pnpm nx run azure_managed_redis:test:integration
pnpm nx run azure_managed_redis:test:e2e
```

## Notes

- Azure Managed Redis supersedes Azure Cache for Redis. Prefer this module for new workloads.
- See the [Azure Managed Redis sizing calculator](https://amrsizingcalculator.com/) for SKU guidance.
