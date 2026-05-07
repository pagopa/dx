resource "random_integer" "instance_number" {
  min = 10
  max = 99
}

data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "this" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "sas"
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_user_assigned_identity" "sas_tester" {
  name                = "dx-delegated-sas-mi-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.this.name

  tags = local.tags
}

module "workload_identity_blob_roles" {
  source = "../../../azure_role_assignments"

  principal_id    = azurerm_user_assigned_identity.sas_tester.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_blob = [
    {
      storage_account_name = module.storage_account.name
      resource_group_name  = azurerm_resource_group.this.name
      container_name       = local.container_name
      role                 = "writer"
      description          = "Allow the example managed identity to upload, overwrite, and read blobs in the delegated-access container."
    }
  ]
}

module "current_principal_blob_roles" {
  source = "../../../azure_role_assignments"

  principal_id    = data.azurerm_client_config.current.object_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_blob = [
    {
      storage_account_name = module.storage_account.name
      resource_group_name  = azurerm_resource_group.this.name
      container_name       = local.container_name
      role                 = "writer"
      description          = "Allow the current caller to run the delegated SAS verification script locally with DefaultAzureCredential."
    }
  ]
}

resource "azurerm_role_assignment" "workload_identity_delegator" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Delegator"
  principal_id         = azurerm_user_assigned_identity.sas_tester.principal_id
  description          = "Allow the example managed identity to request user delegation keys for Blob SAS generation."
}

resource "azurerm_role_assignment" "current_principal_delegator" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Delegator"
  principal_id         = data.azurerm_client_config.current.object_id
  description          = "Allow the current caller to request user delegation keys when running the local verification script."
}