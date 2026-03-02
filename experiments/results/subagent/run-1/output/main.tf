# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = local.resource_group_name
  location = local.environment.location
  tags     = local.tags
}

# Function App with DX module
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.3"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name

  virtual_network = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }

  subnet_cidr   = null
  subnet_pep_id = var.subnet_pep_id

  node_version      = var.function_node_version
  stack             = "node"
  use_case          = "default"
  health_check_path = "/api/health"

  application_insights_connection_string = var.application_insights_connection_string

  app_settings = {
    "NODE_ENV"                     = "production"
    "COSMOS_DB_ENDPOINT"           = module.cosmos_db.endpoint
    "COSMOS_DB_KEY"                = "@Microsoft.KeyVault(VaultName=${data.azurerm_key_vault.kv.name};SecretName=cosmos-primary-key)"
    "STORAGE_ACCOUNT_NAME"         = module.storage_account.name
    "STORAGE_CONNECTION_STRING"    = "@Microsoft.KeyVault(VaultName=${data.azurerm_key_vault.kv.name};SecretName=storage-connection-string)"
    "COSMOS_DB_DATABASE_NAME"      = azurerm_cosmosdb_sql_database.db.name
    "COSMOS_DB_CONTAINER_NAME"     = azurerm_cosmosdb_sql_container.items.name
  }

  tags = local.tags
}

# Storage Account with DX module
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name

  use_case = "default"

  subnet_pep_id = var.subnet_pep_id

  subservices_enabled = {
    blob  = true
    queue = true
    table = true
  }

  containers = [
    {
      name        = "uploads"
      access_type = "private"
    },
    {
      name        = "artifacts"
      access_type = "private"
    }
  ]

  tags = local.tags
}

# Cosmos DB Account with DX module
module "cosmos_db" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~> 0.4"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.rg.name

  use_case = "default"

  subnet_pep_id = var.subnet_pep_id

  consistency_policy = {
    consistency_preset = var.cosmos_consistency_preset
  }

  primary_geo_location = {
    location       = local.environment.location
    zone_redundant = true
  }

  tags = local.tags
}

# Cosmos DB Serverless Configuration
# Note: DX module may not support serverless directly via use_case
# Using raw resource to enable serverless capability if needed
resource "azurerm_cosmosdb_account" "serverless" {
  count = 0 # Set to 1 if DX module doesn't support serverless

  name                = local.cosmos_db_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"

  capabilities {
    name = "EnableServerless"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = local.environment.location
    failover_priority = 0
  }

  tags = local.tags
}

# Cosmos DB Database
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "app-database"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = module.cosmos_db.name
}

# Cosmos DB Container
resource "azurerm_cosmosdb_sql_container" "items" {
  name                = "items"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = module.cosmos_db.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_paths = ["/id"]
}

# Store sensitive outputs in Key Vault
resource "azurerm_key_vault_secret" "cosmos_primary_key" {
  name         = "cosmos-primary-key"
  value        = module.cosmos_db.primary_key
  key_vault_id = data.azurerm_key_vault.kv.id
  tags         = local.tags
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = module.storage_account.primary_connection_string
  key_vault_id = data.azurerm_key_vault.kv.id
  tags         = local.tags
}

# Grant Function App access to Key Vault
resource "azurerm_role_assignment" "function_kv_secrets_user" {
  scope                = data.azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.function_app.function_app.principal_id
}
