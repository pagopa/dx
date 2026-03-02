# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.tags
}

# Storage Account for Function App
module "storage_account_function" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.main.name
  subnet_pep_id       = var.subnet_pep_id
  tags                = local.tags

  use_case = "default"

  subservices_enabled = {
    blob  = true
    file  = true
    queue = true
    table = true
  }

  force_public_network_access_enabled = false
}

# Storage Account for artifacts
module "storage_account_artifacts" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "artifacts"
    instance_number = var.instance_number
  }

  resource_group_name = azurerm_resource_group.main.name
  subnet_pep_id       = var.subnet_pep_id
  tags                = local.tags

  use_case = "default"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  containers = [
    {
      name        = "data"
      access_type = "private"
    }
  ]

  force_public_network_access_enabled = false
}

# Cosmos DB (NoSQL, Serverless)
module "cosmos_db" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~> 0.4"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.main.name
  subnet_pep_id       = var.subnet_pep_id
  tags                = local.tags

  use_case = "default"

  consistency_policy = {
    consistency_preset = "default"
  }

  primary_geo_location = {
    location       = var.location
    zone_redundant = true
  }

  force_public_network_access_enabled = false

  alerts = {
    enabled = false
  }

  diagnostic_settings = {
    enabled = false
  }
}

# Cosmos DB SQL Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "main-db"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmos_db.name

  # Serverless throughput (no provisioned RU/s)
  # Throughput is automatically scaled based on consumption
}

# Cosmos DB SQL Container
resource "azurerm_cosmosdb_sql_container" "items" {
  name                = "items"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmos_db.name
  database_name       = azurerm_cosmosdb_sql_database.main.name

  partition_key_paths = ["/id"]

  # Serverless mode requires no throughput configuration
}

# Function App with Node.js 20
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.3"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.main.name
  virtual_network     = local.virtual_network
  subnet_pep_id       = var.subnet_pep_id
  tags                = local.tags

  stack        = "node"
  node_version = 20

  health_check_path = "/api/health"

  app_settings = {
    # Cosmos DB connection (using Key Vault reference)
    COSMOS_DB_ENDPOINT        = module.cosmos_db.endpoint
    COSMOS_DB_KEY             = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=cosmos-db-primary-key)"
    COSMOS_DB_DATABASE_NAME   = azurerm_cosmosdb_sql_database.main.name
    COSMOS_DB_CONTAINER_NAME  = azurerm_cosmosdb_sql_container.items.name

    # Storage Account connection (using Key Vault reference)
    ARTIFACTS_STORAGE_CONNECTION_STRING = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=artifacts-storage-connection-string)"

    # Application settings
    NODE_ENV = "production"
  }

  use_case = "default"

  diagnostic_settings = {
    enabled = false
  }
}

# Store Cosmos DB primary key in Key Vault
resource "azurerm_key_vault_secret" "cosmos_db_primary_key" {
  name         = "cosmos-db-primary-key"
  value        = module.cosmos_db.primary_key
  key_vault_id = data.azurerm_key_vault.main.id
  tags         = local.tags
}

# Store Artifacts Storage connection string in Key Vault
resource "azurerm_key_vault_secret" "artifacts_storage_connection_string" {
  name         = "artifacts-storage-connection-string"
  value        = module.storage_account_artifacts.primary_connection_string
  key_vault_id = data.azurerm_key_vault.main.id
  tags         = local.tags
}

# Data source for existing Key Vault
data "azurerm_key_vault" "main" {
  name                = var.key_vault_name
  resource_group_name = var.virtual_network_resource_group_name
}

# Grant Function App read access to Key Vault secrets
resource "azurerm_role_assignment" "function_app_kv_secrets_user" {
  scope                = data.azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.function_app.function_app.principal_id
}
