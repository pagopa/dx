# Resource Group
resource "azurerm_resource_group" "this" {
  name     = local.rg_name
  location = var.environment.location
  tags     = local.tags
}

# Storage Account for Function App and general use
resource "azurerm_storage_account" "this" {
  name                     = local.storage_name
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  kind                     = "StorageV2"
  allow_nested_items_to_be_public = false
  tags = local.tags
}

# Cosmos DB account (Core SQL API)
resource "azurerm_cosmosdb_account" "this" {
  name                = local.cosmos_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.this.location
    failover_priority = 0
  }

  capabilities = [
    {
      name = "EnableMultipleWriteLocations"
    }
  ]

  tags = local.tags
}

# App Service Plan for Consumption (Functions v4)
resource "azurerm_app_service_plan" "this" {
  name                = "${local.function_app_name}-plan"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  kind                = "FunctionApp"

  sku {
    tier = "Dynamic"
    size = "Y1"
  }

  tags = local.tags
}

# Function App (Node.js)
resource "azurerm_function_app" "this" {
  name                       = local.function_app_name
  location                   = azurerm_resource_group.this.location
  resource_group_name        = azurerm_resource_group.this.name
  app_service_plan_id        = azurerm_app_service_plan.this.id
  storage_account_name       = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key
  version                    = "~4"

  site_config {
    node_version = var.node_version
    scm_type     = "LocalGit"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}
