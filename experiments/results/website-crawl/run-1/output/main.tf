resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.environment.location
  tags     = local.tags
}

resource "dx_available_subnet_cidr" "function_app" {
  virtual_network_id = data.azurerm_virtual_network.main.id
  prefix_length      = 26
}

resource "azurerm_subnet" "function_app" {
  name                 = "${local.function_app_name}-snet"
  resource_group_name  = var.virtual_network.resource_group_name
  virtual_network_name = var.virtual_network.name
  address_prefixes     = [dx_available_subnet_cidr.function_app.cidr_block]

  delegation {
    name = "function-delegation"

    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action"
      ]
    }
  }
}

module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.1"

  environment         = var.environment
  resource_group_name = azurerm_resource_group.main.name
  use_case            = "default"

  subnet_pep_id = var.subnet_pep_id

  subservices_enabled = {
    blob  = true
    file  = true
    queue = true
    table = true
  }

  tags = local.tags
}

module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.3"

  environment         = var.environment
  resource_group_name = azurerm_resource_group.main.name
  use_case            = "default"

  virtual_network = var.virtual_network
  subnet_id       = azurerm_subnet.function_app.id
  subnet_pep_id   = var.subnet_pep_id

  node_version      = 20
  health_check_path = "/api/health"

  app_settings = local.app_settings

  tags = local.tags
}

module "cosmos_db" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~> 0.4"

  environment         = var.environment
  resource_group_name = azurerm_resource_group.main.name
  use_case            = "default"

  subnet_pep_id = var.subnet_pep_id

  consistency_policy = {
    consistency_preset = "default"
  }

  force_public_network_access_enabled = false

  tags = local.tags
}

resource "azurerm_cosmosdb_sql_database" "main" {
  name                = "MainDatabase"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmos_db.name
  throughput          = 400
}

resource "azurerm_cosmosdb_sql_container" "items" {
  name                = "Items"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = module.cosmos_db.name
  database_name       = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths = ["/id"]
  throughput          = 400
}
