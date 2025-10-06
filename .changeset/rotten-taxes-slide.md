---
"azure_cosmos_account": minor
---

# Minor Changes

Disabled local authentication in the Azure Cosmos DB account module by setting `local_authentication_disabled = true`

## Upgrade Notes

This is a breaking change that affects how authentication works with Cosmos DB:

- Users must now configure the new `authorized_teams` variable with principal IDs of teams that need reader or writer access (See PR: #549).
  
  **Without this configuration, teams will no longer be able to manage databases through the Azure portal**
  
- Connected applications (function app/app services) also require appropriate role assignments to continue functioning correctly.
  
  For Example:
  
  ```hcl
  module "example_cosmos" {
    source  = "pagopa-dx/azure-cosmos-account/azurerm"
    version = "~> 0.0"
    # other variables
  }
  
  module "example_app_service" {
    source  = "pagopa-dx/azure-app-service/azurerm"
    version = "~> 2.0"
    # other variables
  }
  
  module "app_service_roles" {
    source  = "pagopa-dx/azure-role-assignments/azurerm"
    version = "~> 1.0"
    principal_id    = module.example_app_service.app_service.app_service.principal_id
    subscription_id = data.azurerm_subscription.current.subscription_id
    cosmos = [
      {
        account_name        = module.example_cosmos.name
        resource_group_name = var.resource_group_name
        description         = "Grants write access to CosmosDB for the App Service"
        role                = "writer" # other possible values: "reader" e "owner"
    }]
  }
  ```
