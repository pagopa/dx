# azure_storage_account

## 2.1.4

### Patch Changes

- dba6e7b: Expose storage account `primary_queue_endpoint` output.

  Both `azure_function_app` and `azure_storage_account` modules now expose the primary queue endpoint: `storage_account.primary_queue_endpoint`.
  This enables RBAC authentication configuration on queues.

  ### Example

  Configure managed identity authentication for Azure Functions queue triggers using the queue endpoint (where `module.storage` is an instance of the `azure_storage_account` module):

  ```hcl
  app_settings = {
    AzureWebJobsStorage__accountName      = module.storage.name                   # Set the storage account name for Azure Functions
    AzureWebJobsStorage__queueServiceUri  = module.storage.primary_queue_endpoint # Set the queue service URI for Azure Functions to enable identity-based authentication
  }
  ```

  This enables identity-based connections without requiring connection strings, improving security for Azure Functions bindings.

## 2.1.3

### Patch Changes

- a596707: fix variable validation when values are null

## 2.1.2

### Patch Changes

- 8f7ca94: Align examples

## 2.1.1

### Patch Changes

- 9cb1777: Add `override_infrastructure_encryption` variable to prevent storage account recreation for audit use case

  In version 2.1.0, the `infrastructure_encryption_enabled` setting was enabled by default for the audit use case. This caused a breaking change for existing storage accounts, as modifying this parameter forces resource recreation in Azure.

  This patch introduces the `override_infrastructure_encryption` variable (default: `false`) to allow disabling infrastructure encryption when needed, preventing the forced recreation of existing storage accounts while maintaining backward compatibility.

  **Note**: This variable is marked as deprecated and will be removed in the next major version. Infrastructure encryption should be managed through proper use case configuration.

## 2.1.0

### Minor Changes

- 89c46ca: Enhance security and compliance for Azure Storage Account.

  ## Migration Guide

  For existing audit storage accounts, add diagnostic settings:

  ```hcl
  module "audit_storage" {
    source = "./modules/azure_storage_account"

    use_case = "audit"

    # NEW: Required for compliance
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    }

    # OPTIONAL: Override default retention (default changed from 1095 to 365 days)
    audit_retention_days = 365
  }
  ```

  Infrastructure encryption only applies to new storage accounts (Azure limitation).

## 2.0.0

### Major Changes

- 6e12973: # Major Changes
  1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
  2. Add new variables for container, queue and tables creation.

  ## Upgrade Notes

  | Old Value | New Value        | Description                                                       |
  | --------- | ---------------- | ----------------------------------------------------------------- |
  | s         | development      | Used only for `development` and `testing` purposes                |
  | l         | default          | Ideal for `production` environments                               |
  | _none_    | audit            | For storing audit logs with high security and long-term retention |
  | _none_    | delegated_access | For sharing files externally, forcing secure access patterns      |
  | _none_    | archive          | For long-term, low-cost backup and data archiving                 |

  This change simplifies and clarifies the selection of Storage Account.
  - The `audit` use case now requires Customer-Managed Key (BYOK) encryption to be enabled.
  - For the `delegated_access` use case, `shared_access_key_enabled` is now set to false.
  - Microsoft Defender for Storage (`advanced_threat_protection`) is now consistently enabled for use cases exposed to higher risks, such as `delegated_access`.

  To migrate to this new major version:
  1. Update the module version to `~> 2.0` in your Terraform configuration.
  2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
  3. Optionally, configure the new `containers`, `queues`, and `tables` variables to create the desired resources within the Storage Account.

  For Example:
  - **Before**

    ```hcl
    module "storage_account" {
      source  = "pagopa-dx/azure-storage-account/azurerm
      version = "~> 1.0"
      tier    = "l"
      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "storage_account" {
      source  = "pagopa-dx/azure-storage-account/azurerm
      version = "~> 2.0"

      use_case = "default"

      containers = [
        {
          name        = "container1"
          access_type = "private"
        },
        {
          name        = "container2"
          access_type = "private"
        }
      ]

      tables = [
        "table1",
        "table2"
      ]

      queues = [
        "queue1",
        "queue2"
      ]

      # ...other variables remain unchanged...
    }
    ```

  ### Note for already existing resources

  If `containers`, `queues`, or `tables` were previously created manually or through other means, use a [moved](https://developer.hashicorp.com/terraform/language/block/moved) file approach to map the existing resource addresses to the new module-managed addresses.
  1. Create a file named `moved.tf` in the same directory as your Terraform configuration.
  2. Add one `moved` block for each resource you want to reassign to the module. Inspect the `terraform plan` result carefully to see what Terraform intends to destroy/create.

  Example `moved.tf` block:

  ```hcl
  moved {
    from = resource.azure_storage_container.old_container
    to   = module.storage_account.azure_storage_container.this[N]
  }
  ```

  Add one `moved` block per existing container/queue/table. Make sure the `from` address matches the existing resource address in your current configuration/state, and use the correct index `N` in the `to` address based on the order of the `containers`, `queues`, and `tables` lists you pass to the module so that internal indexes line up correctly.

## 1.0.1

### Patch Changes

- d5aecdf: Ignore customer_managed_key value as per [documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) to avoid removing CMK already instantiated created via the azurerm_storage_account_customer_managed_key resource

## 1.0.0

### Major Changes

- c548567: **BREAKING CHANGE:**

  Public access to blobs within containers is now disabled by default in the Azure Storage Account module. If public blob access is explicitly required, this setting must be overridden with variable `force_public_network_access_enabled`.

## 0.1.1

### Patch Changes

- e73a238: Add module version tag

## 0.1.0

### Minor Changes

- f2e75a6: Make subnet pep id optional if force public access is true

## 0.0.14

### Patch Changes

- 9ce888c: Update Test to avoid conflict resources

## 0.0.13

### Patch Changes

- 66c32b9: Update README.md and variables descriptions

## 0.0.12

### Patch Changes

- 6ab08ed: Update provider dx version to support null domain, update test and example

## 0.0.11

### Patch Changes

- f0d352b: Replace naming convention module with DX provider functions

## 0.0.10

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.0.9

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.0.8

### Patch Changes

- e7a44b0: Allowing key vault based customer managed key to be automatically created and used by the storage account's system assigned managed identity
- 4eb8f9f: Removed provider definition and test updated

## 0.0.7

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.0.6

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.5

### Patch Changes

- f44fec3: Fixed bug not allowing to create public storage accounts

## 0.0.4

### Patch Changes

- 1865d33: Added primary_web_host output

## 0.0.3

### Patch Changes

- 2cfa152: Removed configuration of HSM encryption in favor of larger compatibility
- 3f205e6: Added id output to storage account module
- afcf1f2: Added tests for each modules
- 71ee19f: Remove unnecessary static website validation rule

## 0.0.2

### Patch Changes

- 22373ed: First version implemented
- 3b022b9: Examples updated and new standard for locals has been used
