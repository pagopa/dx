locals {
  # Common tags applied to all resources
  common_tags = merge(var.tags, {
    CreatedBy   = "Terraform"
    Environment = var.environment.env_short
  })

  # Resource names using DX provider naming convention
  resource_group_name   = provider::dx::resource_name(var.environment.env_short, "rg")
  storage_account_name  = provider::dx::resource_name(var.environment.env_short, "st")
  function_app_name     = provider::dx::resource_name(var.environment.env_short, "fn")
  cosmosdb_account_name = provider::dx::resource_name(var.environment.env_short, "cosmos")
  app_service_plan_name = provider::dx::resource_name(var.environment.env_short, "asp")

  # Function App settings with Key Vault references
  function_app_settings = merge(
    var.function_app_settings,
    {
      "FUNCTIONS_WORKER_RUNTIME"       = "node"
      "WEBSITE_NODE_DEFAULT_VERSION"   = "~20"
      "AzureWebJobsStorage"            = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.storage_connection_string.id})"
      "COSMOSDB_CONNECTION_STRING"     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.cosmosdb_connection_string.id})"
      "APPINSIGHTS_INSTRUMENTATIONKEY" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.appinsights_key.id})"
    }
  )
}
