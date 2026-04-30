# https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-typescript#connecting-to-host-storage-with-an-identity

# AzureWebJobsStorage
resource "azurerm_role_assignment" "function_host_storage" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "DX Function Host Storage"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
  description          = "Allow Function App to manage host storage blobs, queues, and account settings"
}

resource "azurerm_role_assignment" "staging_function_host_storage" {
  count = local.use_case_features.slot ? 1 : 0

  scope                = azurerm_storage_account.this.id
  role_definition_name = "DX Function Host Storage"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage host storage blobs, queues, and account settings"
}

# Durable Function Storage
resource "azurerm_role_assignment" "durable_function_storage" {
  count = local.function_app.has_durable

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "DX Function Durable Storage"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
  description          = "Allow Function App to manage blobs, queues, and tables in the Durable Function storage account"
}

resource "azurerm_role_assignment" "staging_durable_function_storage" {
  count = local.use_case_features.slot && local.function_app.has_durable == 1 ? 1 : 0

  scope                = azurerm_storage_account.durable_function[0].id
  role_definition_name = "DX Function Durable Storage"
  principal_id         = azurerm_linux_function_app_slot.this[0].identity[0].principal_id
  description          = "Allow Function App staging slot to manage blobs, queues, and tables in the Durable Function storage account"
}
