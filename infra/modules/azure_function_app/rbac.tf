# https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-typescript#connecting-to-host-storage-with-an-identity

# AzureWebJobsStorage
resource "azurerm_role_assignment" "function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_blob_data_owner" {
  count = local.function_app.is_slot_enabled

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_account_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_account_contributor" {
  count = local.function_app.is_slot_enabled

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_queue_data_contributor" {
  count = local.function_app.is_slot_enabled

  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
}

# Durable Function Storage
resource "azurerm_role_assignment" "durable_function_storage_blob_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
  description          = "Allow Function App to manage blobs in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_blob_data_contributor" {
  count = local.function_app.is_slot_enabled == 1 && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage blobs in the Durable Function storage account"
}

resource "azurerm_role_assignment" "durable_function_storage_queue_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
  description          = "Allow Function App to manage queues in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_queue_data_contributor" {
  count = local.function_app.is_slot_enabled == 1 && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage queues in the Durable Function storage account"
}

resource "azurerm_role_assignment" "durable_function_storage_table_data_contributor" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
  description          = "Allow Function App to manage tables in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage_table_data_contributor" {
  count = local.function_app.is_slot_enabled == 1 && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage tables in the Durable Function storage account"
}
