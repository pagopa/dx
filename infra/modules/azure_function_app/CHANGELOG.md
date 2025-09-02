# azure_function_app

## 3.0.0

### Major Changes

- 19143b1: Now it is possible to set more than one action group to be invoked when an alert is triggered

  **Migration Guide**

  Replace `action_group_id` with `action_group_ids` and provide a list of action group IDs instead of a single value.

  From this:

  ```hcl
  module "function_app" {
    source = "pagopa/dx-azure-function-app/azurerm"

    action_group_id = "<the-action-group-id>"
  }
  ```

  to this:

  ```hcl
  module "function_app" {
    source = "pagopa/dx-azure-function-app/azurerm"

    action_group_ids = [
      "<the-action-group-id>"
    ]
  }
  ```

## 2.0.2

### Patch Changes

- 8276c0d: Fix Function App Health Check alert name typo

## 2.0.1

### Patch Changes

- 8d5600c: Ignore "health_check_eviction_time_in_min" changes

## 2.0.0

### Major Changes

- 1fa4dfe: Update names of storage account private endpoints

  ### Upgrade Notes

  This change updates the names of the Storage Account Private Endpoints created by the module. The change was necessary to avoid conflicts with the Private Endpoints names create by the `azurerm_storage_account` resource. To change the name, it is required to recreate the Private Endpoints following these steps:
  1. Enabling Service Endpoint for Function App subnet
     - Using Azure Portal, navigate to the Function App's subnet
     - In the right hand side pane, in `Service Endpoints` section, enable the `Microsoft.Storage` service endpoint
  2. Updating Storage Account networking configuration
     - Navigate to the Storage Account associated with the Function App
     - Remove the lock on the Storage Account if present
     - Select the `Networking` tab
     - Under `Public Access`, select `Manage`
       - For `Public network access` option select `Enable`
       - For `Public network access scope` option select `Enable from selected networks`
     - Add the Function App's subnet
     - (Optional) Tick the option `Add your client IPv4 address ('<ip>')`
     - Click `Save` to apply the changes
     - Wait for the changes to be applied and propagated (~10 minutes)
  3. Deleting Private Endpoints
     - Navigate to the Storage Account associated with the Function App
     - Remove the lock on the Storage Account if present
     - Select the `Networking` tab
     - Under `Private endpoints`:
       - Take note of the existing Private Endpoints subresources (e.g. `blob`, `file`, `queue`, `table`)
       - Delete each of them by click on each resource and selecting `Delete` (ignore eventual Data Factory or external teams' resources)
  4. Creating Private Endpoints:
     - For each of the private endpoint subresources noted before, create a new Private Endpoint with the following commands:
       - `az network private-endpoint create -n "<private-endpoint-name>" -g "<function-app-resource-group>" --subnet <subnet-id> --private-connection-resource-id <storage-account-resource-id> --group-id <subresource-name> --connection-name <connection-name> -l <location>`
         - Replace `<private-endpoint-name>` with the name of the Private Endpoint to create (e.g. `pe<function-app-name><subresource-name>`). Get the **value from the Terraform plan**
         - Replace `<function-app-resource-group>` with the resource group of the Function App
         - Replace `<subnet-id>` with the id of the Function App's subnet
         - Replace `<storage-account-resource-id>` with the resource ID of the Storage Account associated with the Function App
         - Replace `<subresource-name>` with the name of the subresource (e.g. `blob`, `file`, `queue`, `table`)
         - Replace `<connection-name>` with a name for the connection (e.g. `conn<function-app-name><subresource-name>`)
         - Replace `<location>` with the Azure region of the Function App
     - `az network private-endpoint dns-zone-group create -g <function-app-resource-group> --endpoint-name <private-endpoint-name> -n "privatelink.<sub>.core.windows.net" --private-dns-zone "<private-dns-zone-id>"`
       - Replace `<function-app-resource-group>` with the resource group of the Function App
       - Replace `<private-endpoint-name>` with the name of the Private Endpoint created before
       - Replace `<sub>` with the subresource name (e.g. `blob`, `file`, `queue`, `table`)
       - Replace `<private-dns-zone-id>` with the resource id of the Private DNS Zone associated with the Storage Account (e.g. `/subscriptions/<subscription-id>/resourceGroups/<dns-zone-resource-group>/providers/Microsoft.Network/privateDnsZones/privatelink.<sub>.core.windows.net`)
  5. Removing Private Endpoints from Terraform state
     - Run the following commands for each of the Private Endpoints created before:
       - `terraform state rm "module.<your-module-name>.module.<function-app-module>.azurerm_private_endpoint.st_<subresource>"`
       - Replace `<your-module-name>` and `function-app-module>` with module names given in your code of the Private Endpoint created before
       - Replace `<subresource>` with the name of the subresource (e.g. `blob`, `file`, `queue`, `table`)
  6. Importing new resources in Terraform state
     - For each of the private endpoint created before, define the following blocks in your Terraform source code (do not apply the changes yet):

       ```hcl
       import {
        id = "<private-endpoint-id>"
        to = "module.<your-module-name>.module.<function-app-module>.azurerm_private_endpoint.st_<subresource>"
       }
       module "function_app" {
        source  = "pagopa-dx/azure-function-app/azurerm"
        version = "~> 2.0"
       }
       ```

       - Replace `<private-endpoint-id>` with the id of the private endpoints created
       - Replace `<your-module-name>` and `function-app-module>` with module names given in your code of the Private Endpoint created before
       - Replace `<subresource>` with the name of the subresource (e.g. `blob`, `file`, `queue`, `table`)

  7. Reverting previous changes
     - Revert the changes done in step `1` and `2`
  8. Run `terraform plan` to verify that no changes are required

## 1.0.1

### Patch Changes

- 1e70ca0: Revert from TLS `1.3` to TLS `1.2` for app service and function app modules, added new variable named tls_version with default `1.2`.

  Ref.: [Azure API Management throwing error in connecting to backend which requires minimum TLS 1.3](https://learn.microsoft.com/en-us/answers/questions/2125989/azure-api-management-throwing-error-in-connecting)

## 1.0.0

### Major Changes

- 50c15f2: TLS 1.3 Upgrade for Azure Function Apps. This change requires azurerm provider version 4.8.0 or higher.

## 0.3.1

### Patch Changes

- 8e6bfa6: Revert "TLS 1.3 Upgrade for Azure Function Apps modules"

## 0.3.0

### Minor Changes

- aae0dc5: TLS 1.3 Upgrade for Azure Function Apps

### Patch Changes

- e73a238: Add module version tag

## 0.2.9

### Patch Changes

- b3254c7: Rename `APPINSIGHTS_CONNECTION_STRING` environment variable.

  This was previously introduced to let the `@pagopa/azure-tracing` package work.

## 0.2.8

### Patch Changes

- 4fb5b12: Improve the descriptions of variables and outputs. Add missing descriptions where not provided.

## 0.2.7

### Patch Changes

- 66efe11: Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

  The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing` package.

## 0.2.6

### Patch Changes

- 625aefe: Replace naming convention module with DX provider functions

## 0.2.5

### Patch Changes

- 7d552d4: Update reference to Azure Naming Convention Module

## 0.2.4

### Patch Changes

- d1a6a1c: Fix visibility of app settings containing sensitive values in Terraform Plan

## 0.2.3

### Patch Changes

- f17598d: Set up custom warm-up for swap and restart
- 32bb588: Align Host and Worker sample rate in Azure Functions module AI tracing

## 0.2.2

### Patch Changes

- 16ecc30: Using a common resource group in terraform tests

## 0.2.1

### Patch Changes

- c0ed98d: Add Durable Functions configuration to Azure Function App resources

## 0.2.0

### Minor Changes

- 34c0c5c: Add support to Durable Functions

## 0.1.3

### Patch Changes

- 42de6f4: Fix an issue where the app setting ´APPINSIGHTS_SAMPLING_PERCENTAGE´ was not set when using ´var.application_insights_key´ instead of ´var.application_insights_connection_string´

## 0.1.2

### Patch Changes

- 3152f40: Variable subnet_cidr is no longer required when a value for subnet_id is provided

## 0.1.1

### Patch Changes

- 8dda982: Add a description in the package.json file

## 0.1.0

### Minor Changes

- 7c0cb16: Add variable to use an existing subnet instead of creating a new one

## 0.0.6

### Patch Changes

- 1d56ff3: Relative module referencing substituted with terraform registry referencing

## 0.0.5

### Patch Changes

- 15ecfc1: Removed xs tier because is unsupported
- 757fd7b: Added var for application insight key

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
