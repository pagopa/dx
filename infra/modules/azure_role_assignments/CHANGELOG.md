# 2.0.0 (2026-04-28)

### ⚠️  Breaking Changes

- Add Azure Managed Redis (AMR) support via a new `managed_redis` input variable, and raise the minimum `azurerm` provider version from `3.114` to `4.60`. ([#1661](https://github.com/pagopa/dx/pull/1661))

  The `managed_redis` input accepts a list of objects with `id` (AMR resource ID), `role` (`reader`, `writer`, or `owner`), and `description`. Role mapping:

  - `reader` → _Azure Managed Redis Reader_ (control-plane read-only)
  - `writer` → data-plane `default` access policy (Redis commands)
  - `owner`  → _Azure Managed Redis Contributor_ (control-plane) + data-plane `default` access policy

  Resource IDs are validated using `provider::azurerm::parse_resource_id`. Writer and owner assignments targeting the same AMR id are deduplicated (both share the `default` data-plane access policy).

  Legacy `redis` input (Azure Cache for Redis) is unchanged and remains backward compatible.

  ## Migration guide

  Version 2 changes the provider contract of the module:

  - In v1, the module supported `azurerm >= 3.114, < 5.0`.
  - In v2, the module requires `azurerm >= 4.60, < 5.0`. This is needed for the `azurerm_managed_redis_access_policy_assignment` resource and the `provider::azurerm::parse_resource_id` provider function used by `managed_redis`.

  To migrate from v1 to v2:

  1. Update the module version constraint from `~> 1.0` to `~> 2.0`.
  2. Update the `azurerm` provider in the consuming stack to version `4.60.0` or newer.
  3. Run `terraform init -upgrade` in the stack that consumes the module, then run `terraform plan`.
  4. Existing `cosmos`, `redis`, `key_vault`, `storage_*`, `event_hub`, `service_bus`, `apim`, and `app_config` inputs are unchanged — no action is required for consumers that do not use the new `managed_redis` input.
  5. Apply the plan.

  Example:

  ```hcl
  terraform {
    required_providers {
      azurerm = {
        source  = "hashicorp/azurerm"
        version = "~> 4.60"
      }
    }
  }

  module "role_assignments" {
    source  = "pagopa-dx/azure-role-assignments/azurerm"
    version = "~> 2.0"

    principal_id    = azurerm_user_assigned_identity.app_identity.principal_id
    subscription_id = data.azurerm_subscription.current.subscription_id

    managed_redis = [
      {
        id          = azurerm_managed_redis.cache.id
        role        = "writer"
        description = "Allow web app to write data to the managed Redis cache"
      },
    ]
  }
  ```

### ❤️ Thank You

- Marco Comi @kin0992

## 1.3.3

### Patch Changes

- 2ff654f: Improved variables documentation for the azure_role_assignments module.
  The updates clarify allowed values for the `role` field (explicity listing "reader", "writer", and "owner") to assist both human users and AI agents.

## 1.3.2

### Patch Changes

- 5279e57: Fix cosmos role assignment, removed the trailing slash from the scope when no collections are provided and the default `*` is used

## 1.3.1

### Patch Changes

- 8f7ca94: Align examples

## 1.3.0

### Minor Changes

- 2ebbaf1: Add support for Azure AppConfiguration

## 1.2.1

### Patch Changes

- 1d4d60f: Add permissions to write tags to blobs

## 1.2.0

### Minor Changes

- 93d355a: Add permissions to set visibility timeout in storage queues to readers

## 1.1.2

### Patch Changes

- c5149ae: Fix bug of missing storage_account_id when assigning roles on specific blob containers, tables or queues

## 1.1.1

### Patch Changes

- 78c93b8: Enhance README with detailed Azure Storage role assignments

## 1.1.0

### Minor Changes

- 63bdf08: Add Service Bus support to manage queues, topics and subscriptions

## 1.0.3

### Patch Changes

- 53374ed: Fix variable validations for submodules still using ids instead of resource names

## 1.0.2

### Patch Changes

- 3c31efb: Add Documentation inside README.md

## 1.0.1

### Patch Changes

- acb24e0: Update README with module description and link to examples

## 1.0.0

### Major Changes

- 4e8ca58: Role assignments can now be created contextually with identities and target resources

  **Migration guide**:
  When using the azurerm provider version >= 3.114.0, enable the beta opt-in feature to access the required provider-defined functions available from version 4 by setting the following environment variable:

  ```
  export ARM_FOURPOINTZERO_BETA=true
  ```

  A `description` field has been added to the role assignments. This field is **required** and can be used to provide why the role assignment is being created.
  A `subscription_id` field has been added to the role assignments. This field is **required** and must be used to provide the subscription ID of the target resource.

  ```

  ```

## 0.1.3

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.2

### Patch Changes

- 075f30a: Fixed roles for API Management

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 63486e9: Storage account queues readers now have two azure roles assigned

### Patch Changes

- afcf1f2: Added tests for each modules
- 2503864: Removed unused locals and add default
