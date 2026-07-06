# 1.0.0 (2026-07-06)

### ⚠️  Breaking Changes

- Set Terraform minimum version to 1.14.0 ([#1940](https://github.com/pagopa/dx/pull/1940))

### ❤️ Thank You

- Andrea Grillo

## 0.1.2 (2026-06-09)

### 🩹 Fixes

- The module now selects the load metric to observe based on the SKU. Additionally, the aggregation method has been changed from Maximum to Average to prevent short-term spikes from triggering false alerts. ([#1819](https://github.com/pagopa/dx/pull/1819))

### ❤️ Thank You

- Danilo Spinelli @gunzip
- Luca Cavallaro

## 0.1.1 (2026-05-19)

### 🩹 Fixes

- Use dedicated private endpoint type for managed Redis private endpoint name ([#1765](https://github.com/pagopa/dx/pull/1765))

### ❤️ Thank You

- Copilot @Copilot
- Marco Comi @kin0992

## 0.1.0 (2026-05-05)

### 🚀 Features

- Add the **Azure Managed Redis (AMR)** Terraform module — opinionated for PagoPA DX with two `use_case` presets, Entra-only authentication, private networking by default, diagnostics wired to Log Analytics, and five built-in metric alerts (plus an opt-in `connected_clients` alert). ([#1649](https://github.com/pagopa/dx/pull/1649), [#1647](https://github.com/pagopa/dx/issues/1647))

  ### Highlights

  - `use_case` presets: `default` (`Balanced_B3`, HA, private, alerts, lock) and `development` (`Balanced_B0`, public, no HA, no diagnostics, no alerts).
  - Scale beyond the default SKU by setting `sku_name_override` to any `Balanced_*` or `ComputeOptimized_*` value (e.g. `ComputeOptimized_X3` for high-throughput workloads). `Balanced_B0` is restricted to `use_case = "development"`.
  - Entra-only data-plane access (access keys are permanently disabled). Wire role assignments externally with the `id` and `principal_id` outputs.
  - Private endpoint on the `redisEnterprise` subresource integrated with `privatelink.redis.azure.net` (resolved automatically from the VNet resource group).
  - Five MS-backed metric alerts (`usedmemorypercentage` warn/critical, `serverLoad` warn/critical, `evictedkeys`) plus an opt-in `connected_clients` alert.

  ### Usage

  ```hcl
  module "managed_redis" {
    source  = "pagopa-dx/azure-managed-redis/azurerm"
    version = "~> 0.0"

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

    use_case          = "default"
    sku_name_override = "ComputeOptimized_X3" # optional; scale up when needed

    virtual_network_id         = data.azurerm_virtual_network.core.id
    log_analytics_workspace_id = data.azurerm_log_analytics_workspace.this.id

    alerts = {
      action_group_id = azurerm_monitor_action_group.core.id
      thresholds = {
        connected_clients = 8000 # opt-in; sized at ~75% of the SKU ceiling
      }
    }
  }
  ```

### ❤️ Thank You

- Copilot @Copilot
- Marco Comi @kin0992