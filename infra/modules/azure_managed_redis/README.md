# DX - Azure Managed Redis

This module provisions Azure Managed Redis with DX-oriented presets, private networking by default, Entra-first data-plane access, and the observability features expected by the other PagoPA DX Azure modules.

## Features

- `use_case` presets for the common paths: `default`, `development`, and `high_throughput`
- RBAC-first authentication with `access_keys_authentication_enabled = false` by default
- Private endpoint support for `redisEnterprise` with `privatelink.redis.azure.net`
- Optional geo-replication, customer-managed keys, diagnostics, metric alerts, and management lock
- Typed configuration for database clustering, modules, eviction policy, and persistence

## Use cases

| Use case | SKU | HA | Persistence | Alerts | Lock |
| --- | --- | --- | --- | --- | --- |
| `default` | `Balanced_B3` | Enabled | RDB every `12h` | Enabled | Enabled |
| `development` | `Balanced_B0` | Disabled | Disabled | Disabled | Disabled |
| `high_throughput` | `ComputeOptimized_X3` | Enabled | RDB every `6h` | Enabled | Enabled |

## Usage

```hcl
module "managed_redis" {
  source = "pagopa-dx/azure-managed-redis/azurerm"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "payments"
    app_name        = "cache"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.this.name
  tags                = local.tags

  subnet_pep_id                        = azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.network.name

  authorized_teams = {
    data_owners = [data.azurerm_client_config.current.object_id]
  }

  database = {
    modules = [
      { name = "RedisJSON" },
      { name = "RediSearch" }
    ]
  }

  diagnostic_settings = {
    enabled                    = true
    log_analytics_workspace_id = data.azurerm_log_analytics_workspace.this.id
  }
}
```

## Key defaults

- Private networking is the default path. Set `force_public_network_access_enabled = true` to skip the private endpoint.
- Entra authentication is preferred. Access keys stay disabled unless you opt in explicitly.
- The default database listens on port `10000`.
- Geo-replication and persistence are mutually exclusive, matching the Azure platform constraints.

## Examples

- [`examples/complete`](./examples/complete): end-to-end module usage with optional hooks for diagnostics, CMK, and geo-replication
- [`examples/network_access`](./examples/network_access): public vs private access validation used by the e2e suite

## Testing

```bash
pnpm nx run azure_managed_redis:test:unit
pnpm nx run azure_managed_redis:test:contract
pnpm nx run azure_managed_redis:test:integration
pnpm nx run azure_managed_redis:test:e2e
```

## Notes

- The DX naming contract uses `managed_redis`, which resolves to the `amr` suffix for the created instance name.
- Azure Managed Redis replaces the legacy Azure Cache for Redis SKUs. Prefer this module for new workloads.
