# DX - Azure Managed Redis

This module provisions [Azure Managed Redis](https://learn.microsoft.com/azure/redis/overview) (AMR) with opinionated PagoPA DX defaults: Entra-only data-plane authentication, private networking, diagnostics wired to Log Analytics, and metric alerts with sensible thresholds.

## Features

- Two `use_case` presets that drive SKU, HA, persistence, diagnostics, alerts, lock, and public/private networking. Use `sku_name_override` to scale beyond the default SKU (e.g. ComputeOptimized for high-throughput workloads).
- Microsoft Entra authentication only. Access keys are permanently disabled on the default database.
- System-assigned managed identity, provisioned automatically.
- Private endpoint on the `redisEnterprise` subresource with DNS integration via `privatelink.redis.azure.net` (for the `default` use case).
- Diagnostic settings streaming `AllMetrics` to a Log Analytics workspace.
- Five built-in metric alerts (memory warn/critical, server load warn/critical, evicted keys) with MS-backed default thresholds, plus an opt-in `connected_clients` alert.
- Management lock (`CanNotDelete`) on all non-development instances.
- Fully opinionated default database: `client_protocol = Encrypted`, `clustering_policy = OSSCluster`, `eviction_policy = VolatileLRU`, no Redis modules.

## Use cases

| Use case      | SKU             | HA       | Public network | Persistence | Diagnostics | Alerts   | Lock     |
| ------------- | --------------- | -------- | -------------- | ----------- | ----------- | -------- | -------- |
| `default`     | `Balanced_B3`   | Enabled  | Disabled       | RDB `1h`    | Enabled     | Enabled  | Enabled  |
| `development` | `Balanced_B0`   | Disabled | Enabled        | Disabled    | Disabled    | Disabled | Disabled |

### Scaling

Both presets default to `Balanced` SKUs. To scale up — for example to a ComputeOptimized SKU for high-throughput workloads — set `sku_name_override` while keeping `use_case = "default"`:

```hcl
use_case          = "default"
sku_name_override = "ComputeOptimized_X3"
```

`sku_name_override` accepts any `Balanced_*` or `ComputeOptimized_*` SKU. `Balanced_B0` is restricted to `use_case = "development"` because it does not support HA or data persistence.

## Alerts

When `use_case` is `default`, five Azure Monitor metric alerts are provisioned on the AMR resource. The `development` use case disables them entirely — percentage-based metrics are noisy on 2-vCPU SKUs (see the MS [small-SKU guidance](https://learn.microsoft.com/azure/redis/best-practices-server-load#recommendations-for-smaller-skus)).

### Default alert matrix

| Alert                      | Metric                 | Agg     | Window / Freq | Threshold | Sev |
|----------------------------|------------------------|---------|---------------|-----------|-----|
| Used memory — warn         | `usedmemorypercentage` | Maximum | PT15M / PT5M  | `> 75`    | 2   |
| Used memory — critical     | `usedmemorypercentage` | Maximum | PT5M / PT1M   | `> 90`    | 1   |
| Server load — warn         | `serverLoad`           | Maximum | PT15M / PT5M  | `> 80`    | 2   |
| Server load — critical     | `serverLoad`           | Maximum | PT5M / PT1M   | `> 90`    | 1   |
| Evicted keys               | `evictedkeys`          | Total   | PT15M / PT5M  | `> 0`     | 2   |
| Connected clients (opt-in) | `connectedclients`     | Maximum | PT15M / PT5M  | `null`    | 2   |

The connected-clients alert is created only when `alerts.thresholds.connected_clients` is set explicitly.

### Why these thresholds

- **`usedmemorypercentage` at 75 (warn) / 90 (critical).** Microsoft recommends scaling up when used memory is consistently over 75% ([memory-management best practices](https://learn.microsoft.com/azure/redis/best-practices-memory-management#monitor-memory-usage), [development best practices](https://learn.microsoft.com/azure/redis/best-practices-development#monitor-memory-usage-cpu-usage-metrics-client-connections-and-network-bandwidth)). 75% gives operators time to scale before the eviction policy starts removing keys. The 90% critical tier (short window, paging severity) catches the imminent OOM/failover scenario documented in [troubleshoot-server#high-memory-usage](https://learn.microsoft.com/azure/redis/troubleshoot-server#high-memory-usage). The module monitors the *percentage* metric so thresholds do not need re-tuning after a SKU change.

- **`serverLoad` at 80 (warn) / 90 (critical).** Directly from [best-practices-server-load](https://learn.microsoft.com/azure/redis/best-practices-server-load#monitor-server-load-and-cpu): *"keep server load under 80% to avoid negative performance effects. Sustained server load over 80% can lead to unplanned failovers."* The 90% critical tier is treated as near-saturation — scale out or shard.

- **`evictedkeys > 0` (sev 2).** Any non-zero eviction count means the cache is shedding keys under memory pressure, and with the default `volatile-lru` policy the application may be silently losing data ([troubleshoot-data-loss#key-eviction](https://learn.microsoft.com/azure/redis/troubleshoot-data-loss#partial-loss-of-keys)). This is a binary signal, not a percentage — zero is the healthy baseline.

- **`connectedclients` is opt-in.** Microsoft recommends alerting on this metric ([development best practices](https://learn.microsoft.com/azure/redis/best-practices-development#monitor-memory-usage-cpu-usage-metrics-client-connections-and-network-bandwidth)), but the safe ceiling varies wildly across SKUs (B-series ≈ 1k connections, larger Enterprise SKUs ≥ 10k). The module exposes the threshold but does not pick a default; set `alerts.thresholds.connected_clients = <~75% of your SKU ceiling>` to enable it.

- **Why `cachemisses` is not monitored.** Cache misses are a normal part of cache behavior; absolute counts convey no health information without a hit-rate ratio (which is not a built-in AMR metric). Microsoft does not list it in the [recommended alerts table](https://learn.microsoft.com/azure/redis/monitor-cache#alerts). For hit-rate visibility, build a workbook over `cachehits / (cachehits + cachemisses)`.

- **Why dual severity.** The 75/80% warn levels give capacity engineers time to act with standard on-call processes; the 90% critical tier (shorter aggregation window, severity 1) is the pager trigger for imminent failover.

### Overriding thresholds

```hcl
alerts = {
  action_group_id = azurerm_monitor_action_group.core.id
  thresholds = {
    used_memory_percentage          = 80   # relax the warn level
    used_memory_percentage_critical = 92
    connected_clients               = 8000 # opt-in, ~75% of an E20 ceiling
  }
}
```

Unset fields fall back to the defaults above. Leaving `connected_clients` at `null` (the default) keeps that alert disabled.

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

  virtual_network_id = data.azurerm_virtual_network.core.id

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.this.id
}
```

## Key defaults

- **Authentication:** Entra-only. Data-plane access policy assignments are the consumer's responsibility; use the `id` and `principal_id` outputs to wire them externally.
- **Networking:** private by default. `development` provisions a public-only instance to simplify local iterations.
- **Database (fully opinionated, not configurable):** `client_protocol = Encrypted` (TLS), `clustering_policy = OSSCluster`, `eviction_policy = VolatileLRU`. No Redis modules are installed.
- **PEP subnet:** the module synthesizes the private-endpoint subnet ID from `var.virtual_network_id` and the DX naming convention (`snet-<prefix>-<env>-pep-<loc>-01`); the subnet must exist in the provided VNet.
- **DNS zone:** the `privatelink.redis.azure.net` private DNS zone is resolved from the virtual network's resource group (extracted from `virtual_network_id` using `parse_resource_id`) unless `private_dns_zone_resource_group_name` is set.
- **Persistence:** RDB with a `1h` frequency. AOF is not supported by this module.
- **Endpoint:** consumers connect via the `endpoint` output (`hostname:port`); the default database listens on port `10000`.

## Unsupported on purpose

These features are intentionally left out of v0.x to keep the surface small. They will be re-introduced incrementally, tracked as follow-ups under [CES-1909](https://pagopa.atlassian.net/browse/CES-1909):

- Customer-managed keys and user-assigned identities.
- Geo-replication (`azurerm_managed_redis_geo_replication`). Consume the `id` output to wire it externally.
- `authorized_teams` RBAC helper. Use `azure_role_assignments` or `azurerm_managed_redis_access_policy_assignment` directly.
- Redis modules (`RediSearch`, `RedisJSON`, `RedisBloom`, `RedisTimeSeries`) and per-instance overrides for `eviction_policy`, `client_protocol`, and `clustering_policy`.

## Examples

- [`examples/complete`](./examples/complete): minimal end-to-end usage wired against an existing Resource Group, VNet, and Log Analytics workspace.
- [`examples/network_access`](./examples/network_access): public vs. private use-case comparison used by the e2e suite.

## Testing

```bash
pnpm nx run azure_managed_redis:test:unit
pnpm nx run azure_managed_redis:test:contract
```

Integration and end-to-end test layers are tracked as follow-ups under [CES-1909](https://pagopa.atlassian.net/browse/CES-1909).

## Notes

- Azure Managed Redis supersedes Azure Cache for Redis. Prefer this module for new workloads.
- See the [Azure Managed Redis sizing calculator](https://amrsizingcalculator.com/) for SKU guidance.
