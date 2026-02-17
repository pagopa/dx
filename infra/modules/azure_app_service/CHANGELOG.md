# azure_app_service

## 2.1.0

### Minor Changes

- a3c1352: Add support for diagnostic settings on App Service and App Service Slot resources

### Patch Changes

- 8f7ca94: Align examples
- d47286b: Disable diagnostic settings for the staging slot. Keeping diagnostic settings enabled for both production and staging slot may cause confusion at querying time.

## 2.0.1

### Patch Changes

- f7fe153: Add nonsensitive function to show non sensitive appsettings as Plan outputs

## 2.0.0

### Major Changes

- e607688: # Major Changes
  1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
  2. Add new variables `size` for sku override.

  ## Upgrade Notes

  | Old Value | New Value | Description                         |
  | --------- | --------- | ----------------------------------- |
  | s         | _none_    | Does not exist anymore              |
  | m         | _none_    | Does not exist anymore              |
  | l         | default   | Ideal for `production` environments |
  | xl        | high_load | Ideal for `high_load` scenarios     |

  This change simplifies and clarifies the selection of App Service.

  To migrate to this new major version:
  1. Update the module version to `~> 2.0` in your Terraform configuration.
  2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
  3. Optionally, configure the new `size` variable to create the desired SKU within the App Service.

  For Example:
  - **Before**

    ```hcl
    module "app_service" {
      source  = "pagopa-dx/azure-app-service/azurerm"
      version = "~> 1.0"
      tier    = "l"
      # ...other variables...
    }
    ```

  - **After**

    ```hcl
    module "app_service" {
      source  = "pagopa-dx/azure-app-service/azurerm"
      version = "~> 2.0"
      use_case = "default"
      # ...other variables remain unchanged...
    }
    ```

## 1.0.1

### Patch Changes

- 1e70ca0: Revert from TLS `1.3` to TLS `1.2` for app service and function app modules, added new variable named tls_version with default `1.2`.

  Ref.: [Azure API Management throwing error in connecting to backend which requires minimum TLS 1.3](https://learn.microsoft.com/en-us/answers/questions/2125989/azure-api-management-throwing-error-in-connecting)

## 1.0.0

### Major Changes

- b271b64: TLS 1.3 Upgrade for Azure App Services. This change requires azurerm provider version 4.8.0 or higher.

## 0.2.1

### Patch Changes

- beac2dc: Revert "TLS 1.3 Upgrade for Azure App Services modules"

## 0.2.0

### Minor Changes

- fd023c1: TLS 1.3 Upgrade for Azure App Services

### Patch Changes

- e73a238: Add module version tag

## 0.1.10

### Patch Changes

- b3254c7: Rename `APPINSIGHTS_CONNECTION_STRING` environment variable.

  This was previously introduced to let the `@pagopa/azure-tracing` package work.

## 0.1.9

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.1.8

### Patch Changes

- 66efe11: Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

  The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing` package.

## 0.1.7

### Patch Changes

- 7edba50: Replace naming convention module with DX provider functions

## 0.1.6

### Patch Changes

- 6421087: Add module documentation in README files

## 0.1.5

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.1.4

### Patch Changes

- f17598d: Set up custom warm-up for swap and restart

## 0.1.3

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.1.2

### Patch Changes

- 3152f40: Variable subnet_cidr is no longer required when a value for subnet_id is provided

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 7c0cb16: Add variable to use an existing subnet instead of creating a new one

## 0.0.7

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.6

### Patch Changes

- 5c46e66: Set app command line for java applications
- 3b9baf7: Adding to outputs the recordsets pointing to app services' private endpoint

## 0.0.5

### Patch Changes

- ced44ee: Set required java_server and java_server_version parameters for java stack applications
- 15ecfc1: Removed xs tier because is unsupported

## 0.0.4

### Patch Changes

- 8579691: Fixed xs configuration for App Service, minor for Function App
- 0457561: Fixed cosmos Alert variable, removed old provider configuration and added xs case into functions and app service modules

## 0.0.3

### Patch Changes

- afcf1f2: Added tests for each modules

## 0.0.2

### Patch Changes

- 3b022b9: Examples updated and new standard for locals has been used
