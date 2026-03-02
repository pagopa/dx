# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = local.environment.location
  tags     = local.tags
}

# Log Analytics Workspace for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = local.log_analytics_workspace_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# Application Insights for Function App monitoring
resource "azurerm_application_insights" "main" {
  name                = local.application_insights_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.tags
}

# Key Vault for secrets management
resource "azurerm_key_vault" "main" {
  name                        = local.key_vault_name
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
  enable_rbac_authorization   = true
  enabled_for_disk_encryption = true

  tags = local.tags
}

# Storage Account for Function App
resource "azurerm_storage_account" "function" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true
  }

  tags = local.tags
}

# Cosmos DB Account with NoSQL API (serverless)
resource "azurerm_cosmosdb_account" "main" {
  name                = local.cosmos_db_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  capabilities {
    name = "EnableServerless"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  tags = local.tags
}

# App Service Plan for Function App
resource "azurerm_service_plan" "main" {
  name                = local.app_service_plan_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"

  tags = local.tags
}

# Linux Function App (Node.js 20)
resource "azurerm_linux_function_app" "main" {
  name                = local.function_app_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = azurerm_storage_account.function.name
  storage_account_access_key = azurerm_storage_account.function.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }

    application_insights_key               = azurerm_application_insights.main.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.main.connection_string
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    # Reference Cosmos DB connection string from Key Vault
    COSMOS_DB_ENDPOINT = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=${azurerm_key_vault_secret.cosmos_endpoint.name})"
    COSMOS_DB_KEY      = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=${azurerm_key_vault_secret.cosmos_key.name})"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

# Store Cosmos DB credentials in Key Vault
resource "azurerm_key_vault_secret" "cosmos_endpoint" {
  name         = "cosmos-db-endpoint"
  value        = azurerm_cosmosdb_account.main.endpoint
  key_vault_id = azurerm_key_vault.main.id
  tags         = local.tags

  depends_on = [azurerm_role_assignment.kv_secrets_officer]
}

resource "azurerm_key_vault_secret" "cosmos_key" {
  name         = "cosmos-db-key"
  value        = azurerm_cosmosdb_account.main.primary_key
  key_vault_id = azurerm_key_vault.main.id
  tags         = local.tags

  depends_on = [azurerm_role_assignment.kv_secrets_officer]
}

# Grant Function App access to Key Vault secrets
resource "azurerm_role_assignment" "function_kv_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_function_app.main.identity[0].principal_id
}

# Grant current user/service principal access to manage Key Vault secrets
resource "azurerm_role_assignment" "kv_secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}
