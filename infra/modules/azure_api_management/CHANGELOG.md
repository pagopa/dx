# 5.0.0 (2026-11-20)

### ⚠️  Breaking Changes

- Set Terraform binary minimum version to 1.16.0. ([#1923](https://github.com/pagopa/dx/pull/1923))
  Set `azurerm` provider minimum version to 5.0.
  Simplify the Azure API Management module contract.

  ### Migration guide

  - Update the module version constraint to `~> 5.0`, require Terraform `>= 1.16.0`, and set the caller's AzureRM provider constraint to `~> 5.0`, then run `terraform init -upgrade`.
  - Networking:
    - Set `virtual_network` to the full VNet resource ID; remove `subnet_id`, `subnet_pep_id`, `virtual_network_type_internal`, and `public_ip_address_id`.
    - Remove `private_dns_zone_ids`. Set `private_dns_zone_resource_group_name` if the zones are not in the VNet resource group. 
  - Monitoring:
    - Remove `monitoring` input block, as the diagnostic settings are now managed by the module according to the selected use case. Set `log_analytics_workspace_id` for `cost_optimized` and `high_load` use cases.
    - Remove `management_logger_application_insight_enabled`, `application_insights.enabled`, and `application_insights.connection_string`. Set `application_insights = null` to disable it, or provide its resource `id` to enable it.
  - Certificates:
    - Transfer existing APIM client certificates as described below before removing `key_vault_id` and `certificate_names`.
  - DNS:
    - Replace `key_vault_id` with `key_vault_certificate_id` for management, portal, developer portal, and SCM hostnames.
    - Replace the `hostname_configuration.proxy` list with `use_resource_name_as_default = true` if needed. It sets the APIM resource name as default hostname.
    - Custom proxy hostnames are no longer supported
  - Miscellaneous:
    - Remove `notification_sender_email`; use `publisher_email` instead.
    - Remove `lock_enable`; it is automatically set by the module according to the chosen use case.

  #### Preserve existing APIM client certificates

  Transfer eventual **client** certificates before applying the upgrade to prevent
  its deletion.

  1. In each workspace, use `terraform state list` and `terraform state show` to record each
     certificate's address, ID, name, APIM name, resource group, and
     `key_vault_secret_id`.
  2. Add caller-managed resources using the same AzureRM provider, APIM name,
     resource group, and certificate names. Use each exact Key Vault **secret**
     ID from state, including any trailing slash. Replace the example values and
     module references:

     ```hcl
     locals {
       existing_apim_client_certificates = {
         "existing-name" = "https://example.vault.azure.net/secrets/example/"
       }
     }

     resource "azurerm_api_management_certificate" "client" {
       for_each = local.existing_apim_client_certificates

       name                = each.key
       api_management_name = module.apim.name
       resource_group_name = module.apim.resource_group_name
       key_vault_secret_id = each.value
     }
     ```

  3. Move each certificate to its new state address:

     ```hcl
     moved {
        from = "module.apim.azurerm_api_management_certificate.this[0]"
        to   = "azurerm_api_management_certificate.client[\"existing-name\"]"
     }
     ```

     Substitute the actual addresses, including module instance keys, and repeat
     in every affected workspace. Verify each destination's ID with
     `terraform state show`; preserve the APIM identity and its Key Vault access.
  4. Review a fresh plan. Do not apply if it creates, deletes, replaces, or
     unintentionally updates an existing certificate or replaces APIM.

### ❤️ Thank You

- Andrea Grillo

## 4.2.4 (2026-11-03)

### 🩹 Fixes

- Replace department CostCenter with DX specific ([#2478](https://github.com/pagopa/dx/pull/2478))

### ❤️ Thank You

- Andrea Grillo

## 4.2.3 (2026-10-15)

### 🩹 Fixes

- Restore the canonical DX ModuleName tag using the name in project.json, shared with Nx, instead of deriving it from the Terraform installation directory. ([#2364](https://github.com/pagopa/dx/pull/2364))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 4.2.2 (2026-10-13)

### 🩹 Fixes

- Update internal examples and AzureRM constraints ([#2342](https://github.com/pagopa/dx/pull/2342))

### ❤️ Thank You

- Andrea Grillo

## 4.2.1 (2026-10-06)

### 🩹 Fixes

- Accept null overrides for built-in APIM alerts across SKUs ([#2305](https://github.com/pagopa/dx/pull/2305))

### ❤️ Thank You

- Christian Calabrese

## 4.2.0 (2026-10-06)

### 🚀 Features

- Allow APIM consumers to override built-in metric alert thresholds individually or disable selected alerts by setting their threshold to null, without replacing the complete alert configuration. ([#2299](https://github.com/pagopa/dx/pull/2299))

### ❤️ Thank You

- Christian Calabrese

## 4.1.0 (2026-09-23)

### 🚀 Features

- Add SKU-aware default API Management metric alerts ([#2130](https://github.com/pagopa/dx/pull/2130))

### ❤️ Thank You

- Christian Calabrese
- Mario Mupo @mamu0

## 4.0.3 (2026-09-16)

### 🩹 Fixes

- Update example Terraform state backends from the DEV environment to UAT. ([#2204](https://github.com/pagopa/dx/pull/2204))

### ❤️ Thank You

- Andrea Grillo
- Copilot App @Copilot

## 4.0.2 (2026-09-08)

### 🩹 Fixes

- Update internal dependencies ([#2120](https://github.com/pagopa/dx/pull/2120))

### ❤️ Thank You

- Andrea Grillo

## 4.0.1 (2026-09-08)

### 🩹 Fixes

- Change Tests environment to UAT ([#2123](https://github.com/pagopa/dx/pull/2123))

### ❤️ Thank You

- Krusty93
- Mario Mupo @mamu0

# 4.0.0 (2026-09-01)

### ⚠️  Breaking Changes

- Drop support for Terraform versions older than 1.14.0. The minimum required Terraform version is now 1.15.0, and it is suggested to use 1.16.0 or later. ([#2086](https://github.com/pagopa/dx/pull/2086))

### ❤️ Thank You

- Andrea Grillo

## 3.0.1 (2026-08-26)

### 🩹 Fixes

- Read module tags from module manifests ([#2053](https://github.com/pagopa/dx/pull/2053))
- Split Terraform unit and contract tests ([#2055](https://github.com/pagopa/dx/pull/2055))

### ❤️ Thank You

- Andrea Grillo
- Christian Calabrese
- Copilot App @Copilot

## 3.1.0 (2026-07-07)

### 🚀 Features

- Enable user sign up in development use case ([#1948](https://github.com/pagopa/dx/pull/1948))

### ❤️ Thank You

- Andrea Grillo

# 3.0.0 (2026-07-06)

### ⚠️  Breaking Changes

- Set Terraform minimum version to 1.14.0 ([#1940](https://github.com/pagopa/dx/pull/1940))

### ❤️ Thank You

- Andrea Grillo

## 2.2.3

### Patch Changes

- e5570ef: Add diagram to readme.md representing the module architecture

## 2.2.2

### Patch Changes

- e33144c: Fix APIM naming with new provider configuration, avoid replace, use empty name

## 2.2.1

### Patch Changes

- 0dd28ab: Fix variable validation with null values for CI Static Analysis

## 2.2.0

### Minor Changes

- a903b54: This is a **Minor change**. New `hostname_configuration` variable structure, fix `autoscale` configuration, update public network definition, and added dependency on NSG resource.

  ## Upgrade Notes

  ### 1. Custom Domains Variable Structure

  The `hostname_configuration` variable has been redesigned from a flat list to a structured object for better ergonomics and type safety.

  **Before:**

  ```terraform
  hostname_configuration = {
      proxy = [
        {
          default_ssl_binding = false
          host_name           = "api.example.com"
          key_vault_id        = null
        },
        {
          default_ssl_binding = true
          host_name           = "api2.example.com"
          key_vault_id = "https://..."
        },
        {
          default_ssl_binding = false
          host_name           = "api3.example.com"
          key_vault_id = "https://..."
        },
      ]
      developer_portal = null
      management       = null
      portal           = null
    }
  ```

  **After:**

  ```terraform
  hostname_configuration = {
    proxy = [
      {
        host_name                = "api.example.com"
        key_vault_id             = "https://..."
        default_ssl_binding      = true
      }
    ]
    management = [
      {
        host_name                = "mgmt.example.com"
        key_vault_id             = "https://..."
      }
    ]
    # Other optional types: portal, developer_portal, scm
  }
  ```

  **Benefits:**
  - Optional endpoint types can be omitted entirely or set to empty lists `[]` if not used
  - `default_ssl_binding` for proxy is only specified when needed

  ### 2. Autoscale Configuration

  The `autoscale` variable is now nullable with smart zone-aware defaults.
  This fixes the problem when `use_case` is set to `high_load` without the `autoscale` variable set, which previously returned an error due to non-multiple values.

  **Changes:**
  - `enabled` field does not exist anymore, autoscale is defined by `use_case` (this change is backward compatible as the field was ignored)
  - Default changed from a static object to `null`
  - All fields inside `autoscale` are now optional so you can now specify only the fields you want to customize
  - When `null`, defaults are automatically calculated based on the number of availability zones
  - For `high_load` use case (2 zones): all values are multiples of 2
  - For `cost_optimized`/`development` use cases (no zones): values remain as 1

  ### 3. NSG Dependency

  Added explicit `depends_on` relationship between APIM and NSG to prevent parallelism errors during apply operations.

  ### 4. Public Network Access Default

  The default value for `public_network_access_enabled` has been set to `true` and is not changed by the `use_case` variable anymore.

  ## Migration Guide (Optional)

  ### Migrating Custom Domains
  1. Find `hostname_configuration` block in your module calls
  2. Remove all endpoint types that are set to `null` or use empty lists `[]` instead
  3. Existing configurations with explicit `null` values remain compatible

  ### Migrating Autoscale Configuration
  1. Find `autoscale` block in your module calls
  2. Remove the `enabled` field
  3. If you have custom values, keep them as is
  4. If you were relying on defaults, simply remove the entire `autoscale` block or only keep the fields you want to customize

  ## Notes
  - With this change, all custom domain types are now configurable. Previously, only `proxy` was configurable.
  - The `key_vault_id` field accept Key Vault Secret IDs containing certificates, as per the [Azure Terraform provider documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management#key_vault_certificate_id-1)

## 2.1.1

### Patch Changes

- 872ca40: Add ignore changes tag to sku_name property as its value changes according to the actual number of deployed instances

## 2.1.0

### Minor Changes

- 5ea9525: Add variables to support private DNS zones in different subscriptions

## 2.0.5

### Patch Changes

- d929582: Replace deprecated `metric` block with `enabled_metric` in monitor diagnostic settings

  The Azure provider v4 has deprecated the `metric` block with `enabled` attribute in favor of the new `enabled_metric` block in `azurerm_monitor_diagnostic_setting` resources. This change updates the module to use the non-deprecated block to ensure compatibility with future provider versions.

  **Deprecated:**

  ```terraform
  metric {
    category = "AllMetrics"
    enabled  = var.monitoring.metrics.enabled
  }
  ```

  **New:**

  ```terraform
  dynamic "enabled_metric" {
    for_each = var.monitoring.metrics.enabled ? ["AllMetrics"] : []
    content {
      category = enabled_metric.value
    }
  }
  ```

  This change is fully backward compatible - when metrics are enabled, the block is created; when disabled, no block is created (functionally equivalent to `enabled = false`).

  Reference: https://registry.terraform.io/providers/hashicorp/azurerm/4.52.0/docs/resources/monitor_diagnostic_setting.html#enabled_metric-1

## 2.0.4

### Patch Changes

- 59212ec: Fix autoscaler validation condition failing when a use_case with no zones set was used

## 2.0.3

### Patch Changes

- 4122d6c: Validate autoscaling parameters according to zone redundancy

## 2.0.2

### Patch Changes

- 78255e9: Use private endpoint private ip address if exists instead of the native APIM IP

## 2.0.1

### Patch Changes

- 77519e0: # Patch Changes

  Fix `azure_api_management` module behavior for `cost_optimized` use case

  ## Upgrade Notes
  - Resolved an issue where terraform apply failed when using `StandardV2` SKU with `virtual_network_type = Internal`, which is not supported.
    - The default `virtual_network_type` is now set to `External` only for the `cost_optimized` use case, while remaining `Internal` for all other cases.

  - The variable `virtual_network_type_internal`, which previously defaulted to `true`, now defaults to `null` and acts as an override:
    - If not set, defaults are applied (`Internal` for all, `External` for cost_optimized).
    - If explicitly set, its value overrides the default behavior.

  - Added support for a Private Endpoint in the `cost_optimized` scenario to enable private connectivity.
  - `sign_up` configuration is disabled only for `cost_optimized` use case because it is not supported by consumption and V2 tier.
  - Virtual network configuration is now created when `virtual_network_type` is set to `Internal` (as before) or when is `External` and `cost_optimized`.
  - Variable `enable_public_network_access` work as an override: if not set, defaults are applied based on use case; if set, its value is used.

  These changes have no breaking changes for module consumers.

## 2.0.0

### Major Changes

- e379345: # Major Changes

  Replaced the `tier` variable with a new `use_case` variable for tiering configuration.

  ## Upgrade Notes

  | Old Value | New Value      | Description                                                            |
  | --------- | -------------- | ---------------------------------------------------------------------- |
  | s         | development    | Ideal `development` and `testing` purposess                            |
  | m         | cost_optimized | Ideal for `production` environments purposes, now using StandardV2 SKU |
  | l         | high_load      | Ideal for large-scale production workloads                             |
  | xl        | _none_         | Now don't exist                                                        |

  This change simplifies and clarifies the selection of API Management tiers.

  For Example:
  - **Before**

    ```hcl
    module "apim" {
      source  = "pagopa-dx/azure-api-management/azurerm
      version = "~> 1.0"

      tier    = "m"

      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "apim" {
      source  = "pagopa-dx/azure-api-management/azurerm
      version = "~> 2.0"

      use_case = "cost_optimized"

      # ...other variables remain unchanged...
    }
    ```

## 1.2.2

### Patch Changes

- e1418e0: Update README with Public Network Access limitation workaround

## 1.2.1

### Patch Changes

- fc534e7: Fix destination port declaration for Azure Monitor NSG security rule

## 1.2.0

### Minor Changes

- 53f3c6e: Add recommended rules to APIM NSG

## 1.1.4

### Patch Changes

- e73a238: Add module version tag

## 1.1.3

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 1.1.2

### Patch Changes

- 4efcf04: Create APIM diagnostic setting resource, to forward logs to Log Analytics workspace

## 1.1.1

### Patch Changes

- fe9c039: Replace naming convention module with DX provider functions

## 1.1.0

### Minor Changes

- c9f0d4b: Added zones_override and public_ip variables, added new Tier xl for Premium_2

## 1.0.2

### Patch Changes

- 7ef1765: Update API Management README.md
- 7d552d4: Update reference to Azure Naming Convention Module

## 1.0.1

### Patch Changes

- c322c0a: Create APIM diagnostic resource, when AI is enabled, so the requests on the APIM are sent to Application Insights

## 1.0.0

### Major Changes

- 7e82050: Replace `instrumentation_key` with `connection_string` to connect Application Insights

  **Migration Guide**

  Update the `application_insights` block by replacing the `instrumentation_key` with the `connection_string` parameter.

  From this:

  ```
  module "apim" {
    source  = "pagopa/dx-azure-api-management/azurerm"
    ...
    application_insights = {
      enabled             = true
      instrumentation_key = "<the-ai-instrumentation-key>"
    }
  }
  ```

  to this:

  ```
  module "apim" {
    source  = "pagopa/dx-azure-api-management/azurerm"
    ...
    application_insights = {
      enabled           = true
      connection_string = "<the-ai-connection-string>"
    }
  }
  ```

### Patch Changes

- 525585b: Create APIM logger when AI is enabled
- 9570654: Add `resource_id` attribute when creating the APIM logger

  ## NOTE

  It is possible to use this module's version even if you omit the `id` parameter within the `application_insights` block.

  If you add the `id`, this will force the recreation of the Logger resource. If you have some reference to the Logger instance, you should use the `logger_id` output provided by the module.

- 76eaa55: Set the minimum version of Azure provider to `4.1.0`

## 0.0.8

### Patch Changes

- f092cf0: Add minimum version for APIM control plane REST APIs

## 0.0.7

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.0.6

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.5

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.4

### Patch Changes

- e10ab11: Added enable_public_network_access variable for APIM module

## 0.0.3

### Patch Changes

- afcf1f2: Added tests for each modules

## 0.0.2

### Patch Changes

- e4890b1: Added examples and removed required version for terraform
- 3b022b9: Examples updated and new standard for locals has been used
