# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location

  tags = local.tags
}

# Storage Account for Function App
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 0.0"

  name                = local.storage_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  tags = local.tags
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = local.app_service_plan_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  os_type  = "Linux"
  sku_name = "Y1" # Consumption plan for serverless

  tags = local.tags
}

# Function App
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  name                = local.function_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  service_plan_id = azurerm_service_plan.main.id

  storage_account_name       = module.storage_account.name
  storage_account_access_key = module.storage_account.primary_access_key

  runtime = {
    name    = "node"
    version = "20"
  }

  app_settings = merge(
    {
      for s in var.function_app_settings :
      s.name => s.key_vault_secret_name != null ? "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=${s.key_vault_secret_name})" : s.value
    },
    {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_NODE_DEFAULT_VERSION   = "~20"
      AzureWebJobsFeatureFlags       = "EnableWorkerIndexing"
      COSMOS_DB_ENDPOINT             = azurerm_cosmosdb_account.main.endpoint
      COSMOS_DB_DATABASE_NAME        = azurerm_cosmosdb_sql_database.main.name
      COSMOS_DB_CONNECTION_SECRET_KV = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=cosmos-connection-string)"
    }
  )

  identity = {
    type = "SystemAssigned"
  }

  tags = local.tags
}

# Cosmos DB Account (NoSQL API, Serverless)
resource "azurerm_cosmosdb_account" "main" {
  name                = local.cosmos_db_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  offer_type = "Standard"
  kind       = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  tags = local.tags
}

# Cosmos DB SQL Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "main-db"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
}

# Cosmos DB SQL Container (example)
resource "azurerm_cosmosdb_sql_container" "example" {
  name                = "items"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.main.name

  partition_key_paths = ["/id"]

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

# Store Cosmos DB connection string in Key Vault
data "azurerm_key_vault" "main" {
  name                = var.key_vault_name
  resource_group_name = var.key_vault_resource_group_name
}

resource "azurerm_key_vault_secret" "cosmos_connection_string" {
  name         = "cosmos-connection-string"
  value        = azurerm_cosmosdb_account.main.primary_key
  key_vault_id = data.azurerm_key_vault.main.id

  tags = local.tags
}

# Grant Function App access to Key Vault secrets
resource "azurerm_role_assignment" "function_kv_secrets_user" {
  scope                = data.azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.function_app.identity.principal_id
}
