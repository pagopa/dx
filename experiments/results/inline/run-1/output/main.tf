# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# Storage Account for Function App and artifacts
module "storage_account" {
  source  = "pagopa-dx/storage-account/azure"
  version = "~> 1.0"

  name                = local.storage_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  enable_versioning         = true
  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# App Service Plan for Function App
resource "azurerm_service_plan" "main" {
  name                = local.app_service_plan_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  os_type  = "Linux"
  sku_name = "Y1" # Consumption plan

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = provider::dx::resource_name(var.environment.env_short, "appi")
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  application_type  = "web"
  retention_in_days = 90

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# Function App with Node.js 20 runtime
module "function_app" {
  source  = "pagopa-dx/function-app/azure"
  version = "~> 1.0"

  name                = local.function_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  service_plan_id      = azurerm_service_plan.main.id
  storage_account_name = module.storage_account.name

  app_settings = local.function_app_settings

  site_config {
    application_stack {
      node_version = "20"
    }

    always_on         = false
    use_32_bit_worker = false

    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })

  depends_on = [
    azurerm_key_vault_secret.storage_connection_string,
    azurerm_key_vault_secret.cosmosdb_connection_string,
    azurerm_key_vault_secret.appinsights_key
  ]
}

# Cosmos DB Account (NoSQL API, Serverless)
module "cosmosdb_account" {
  source  = "pagopa-dx/cosmosdb-account/azure"
  version = "~> 1.0"

  name                = local.cosmosdb_account_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  offer_type = "Standard"
  kind       = "GlobalDocumentDB"

  capabilities = ["EnableServerless"]

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  enable_automatic_failover = false
  enable_free_tier          = false

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# Cosmos DB Database
resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "main-database"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmosdb_account.name
}

# Cosmos DB Container
resource "azurerm_cosmosdb_sql_container" "main" {
  name                = "main-container"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmosdb_account.name
  database_name       = azurerm_cosmosdb_sql_database.main.name

  partition_key_path    = "/id"
  partition_key_version = 2

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

# Key Vault Secrets for sensitive configuration
resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "storage-connection-string"
  value        = module.storage_account.primary_connection_string
  key_vault_id = var.key_vault_id

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

resource "azurerm_key_vault_secret" "cosmosdb_connection_string" {
  name         = "cosmosdb-connection-string"
  value        = module.cosmosdb_account.primary_connection_string
  key_vault_id = var.key_vault_id

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

resource "azurerm_key_vault_secret" "appinsights_key" {
  name         = "appinsights-instrumentation-key"
  value        = azurerm_application_insights.main.instrumentation_key
  key_vault_id = var.key_vault_id

  tags = merge(local.common_tags, {
    CostCenter     = var.tags.CostCenter
    BusinessUnit   = var.tags.BusinessUnit
    ManagementTeam = var.tags.ManagementTeam
  })
}

# Grant Function App access to Key Vault
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = var.key_vault_id
  tenant_id    = module.function_app.identity_tenant_id
  object_id    = module.function_app.identity_principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Grant Function App access to Cosmos DB
resource "azurerm_cosmosdb_sql_role_assignment" "function_app" {
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmosdb_account.name
  role_definition_id  = "${module.cosmosdb_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002" # Built-in Data Contributor
  principal_id        = module.function_app.identity_principal_id
  scope               = module.cosmosdb_account.id
}
