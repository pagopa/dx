# 2.0.0 (2026-04-27)

### ⚠️  Breaking Changes

- ## Major Changes ([#1617](https://github.com/pagopa/dx/pull/1617))

  The module interface has been simplified. Multiple networking inputs have been consolidated into a single `networking` object, diagnostic settings are now always-on, and the identity model has been switched from user-assigned to system-assigned.

  ### Outputs changed

  | Output                   | Change                                                                                        |
  | ------------------------ | --------------------------------------------------------------------------------------------- |
  | `user_assigned_identity` | **Removed.** The module now uses a system-assigned identity.                                  |
  | `principal_id`           | **New.** Principal ID of the system-assigned managed identity.                                |
  | `subnet`                 | **New.** Exposes `id`, `name`, and `resource_group_name` of the automatically created subnet. |

  ### Migration Guide (v1 → v2)

  #### 1. Remove `subnet_id`, `subnet_cidr`, and `subnet_pep_id`

  The module now manages its own subnet. Remove all three variables. The CAE subnet size is controlled by `use_case`: `/27` for `development`, `/23` for `default`. The PEP subnet is derived automatically from the VNet name.

  ```hcl
  # Before
  module "cae" {
    source = "..."

    subnet_cidr   = "10.0.0.0/23"
    subnet_pep_id = azurerm_subnet.pep.id
    # or
    subnet_id = azurerm_subnet.cae.id
  }

  # After — remove all three, no replacement needed
  module "cae" {
    source = "..."
  }
  ```

  #### 2. Consolidate networking variables into `networking`

  ```hcl
  # Before
  module "cae" {
    source = "..."

    virtual_network = {
      name                = "my-vnet"
      resource_group_name = "rg-network"
    }
    public_network_access_enabled        = false
    private_dns_zone_resource_group_name = "rg-dns"
    subnet_pep_id                        = azurerm_subnet.pep.id
  }

  # After
  module "cae" {
    source = "..."

    networking = {
      virtual_network_id                   = data.azurerm_virtual_network.this.id
      public_network_access_enabled        = false    # optional, default false
      private_dns_zone_resource_group_name = "rg-dns" # optional, defaults to vnet rg
    }
  }
  ```

  #### 3. Add `use_case` (optional, default `"default"`)

  The new `use_case` variable controls environment-specific defaults:

  | Feature         | `default` | `development` |
  | --------------- | --------- | ------------- |
  | CAE subnet size | `/23`     | `/27`         |
  | Zone redundancy | enabled   | disabled      |
  | Management lock | enabled   | disabled      |

  ```hcl
  module "cae" {
    source = "..."

    use_case = "development" # omit to keep default
  }
  ```

  #### 4. Replace `diagnostic_settings` with `log_analytics_workspace_id`

  ```hcl
  # Before
  module "cae" {
    source = "..."

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
    }
  }

  # After
  module "cae" {
    source = "..."

    log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  }
  ```

  #### 5. Update references to the identity output

  ```hcl
  # Before
  principal_id = module.cae.user_assigned_identity.principal_id

  # After
  principal_id = module.cae.principal_id
  ```

  Remove any `azurerm_user_assigned_identity` or associated role assignments that were created outside the module for this purpose — the system-assigned identity is managed entirely by the module.

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 1.2.0

### Minor Changes

- 3e23166: Add public network access support via `public_network_access_enabled` variable (default: `false`).

  When enabled, the Container App Environment is exposed via a public load balancer. When disabled (default), an internal load balancer is used and a private endpoint is created.

  The `subnet_pep_id` variable is now optional and defaults to `null`, but is required when `public_network_access_enabled = false`. Input validation enforces this constraint.

  New outputs added: `default_domain` and `static_ip_address`.

## 1.1.1

### Patch Changes

- b06eece: Remove minimum/maximum count for Consumption workload profile and related ignore_changes block

## 1.1.0

### Minor Changes

- 37f5ab3: Allow setting of diagnostic settings

### Patch Changes

- 8f7ca94: Align examples

## 1.0.2

### Patch Changes

- e73a238: Add module version tag

## 1.0.1

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.0.0

### Major Changes

- 5c2fe13: Export all details of the user-assigned managed identity

  **Migration guide**:

  Replace the occurrences of the exported property `user_assigned_identity` with `user_assigned_identity.client_id`

## 0.2.0

### Minor Changes

- 52dfa04: Features:
  - Add NoDelete locks for Container App Environment and the user-assigned managed identity

  Bug Fixes:
  - Fix the user-assigned managed identity name

### Patch Changes

- 5ceca52: Fix the potential collision with other resource names of the user-assigned managed identity

## 0.1.0

### Minor Changes

- fbec2b1: Create a user-assigned managed identity to be shared among all container apps of this environment

## 0.0.5

### Patch Changes

- b013061: Replace naming convention module with DX provider functions

## 0.0.4

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module
- 9d18d7c: Update README following new guide lines

## 0.0.3

### Patch Changes

- 0385c5a: Removed zone_redundant variable

## 0.0.2

### Patch Changes

- d29a1f4: Add new module for container app environment definition
