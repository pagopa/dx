# https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-typescript#connecting-to-host-storage-with-an-identity

# AzureWebJobsStorage
resource "azurerm_role_assignment" "function_storage_blob_data_owner" {
  count = local.use_container_app ? 0 : 1

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "ca_storage_blob_data_owner" {
  count = local.use_container_app ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azapi_resource.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_blob_data_owner" {
  count = local.use_case_features.slot ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_account_contributor" {
  count = local.use_container_app ? 0 : 1

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "ca_storage_account_contributor" {
  count = local.use_container_app ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azapi_resource.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_account_contributor" {
  count = local.use_case_features.slot ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_queue_data_contributor" {
  count = local.use_container_app ? 0 : 1

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "ca_storage_queue_data_contributor" {
  count = local.use_container_app ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azapi_resource.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_queue_data_contributor" {
  count = local.use_case_features.slot ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

# Durable Function Storage
resource "azurerm_role_assignment" "durable_function_storage_blob_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
  description          = "Allow Function App to manage blobs in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_blob_data_contributor" {
  count = local.use_case_features.slot && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage blobs in the Durable Function storage account"
}

resource "azurerm_role_assignment" "durable_function_storage_queue_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
  description          = "Allow Function App to manage queues in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_queue_data_contributor" {
  count = local.use_case_features.slot && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage queues in the Durable Function storage account"
}

resource "azurerm_role_assignment" "durable_function_storage_table_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_function_app.this[0].identity[0].principal_id
  description          = "Allow Function App to manage tables in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_table_data_contributor" {
  count = local.use_case_features.slot && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage tables in the Durable Function storage account"
}

# https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#azurewebjobssecretstoragekeyvaulturi
resource "azurerm_role_assignment" "key_vault" {
  count = local.use_container_app && var.container_app_config.key_vault.use_rbac ? 1 : 0

  scope                = var.container_app_config.key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azapi_resource.this[0].identity[0].principal_id
}

resource "azurerm_key_vault_access_policy" "key_vault" {
  count = local.use_container_app && var.container_app_config.key_vault.use_rbac == false ? 1 : 0

  key_vault_id = var.container_app_config.key_vault.id
  tenant_id    = var.container_app_config.key_vault.tenant_id
  object_id    = azapi_resource.this[0].identity[0].principal_id

  secret_permissions = [
    "Get",
    "Set",
    "List",
    "Delete",
  ]
}
