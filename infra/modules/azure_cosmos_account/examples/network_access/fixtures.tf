resource "azurerm_resource_group" "e2e_cdb" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e"
    name          = "cdb",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_cosmosdb_sql_database" "public_db" {
  name                = "db"
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.public_cosmos_account.name
}

resource "azurerm_cosmosdb_sql_database" "private_db" {
  name                = "db"
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.private_cosmos_account.name
}

resource "azurerm_cosmosdb_sql_container" "public_items" {
  name                = "items"
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.public_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.public_db.name
  partition_key_paths = ["/id"]
}

resource "azurerm_cosmosdb_sql_container" "private_items" {
  name                = "items"
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.private_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.private_db.name
  partition_key_paths = ["/pk"]
}

resource "azurerm_container_group" "public_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { domain = "e2e", name = "public", resource_type = "container_instance" })
  )
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_cdb.name

  identity { type = "SystemAssigned" }

  os_type = "Linux"

  container {
    name   = "network-access"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port = 8080
    }
  }

  tags = local.tags
}

resource "dx_available_subnet_cidr" "private_app" {
  virtual_network_id = data.azurerm_virtual_network.network.id
  prefix_length      = 26
}

resource "azurerm_subnet" "private_app" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e",
    name          = "private",
    resource_type = "container_instance_subnet"
  }))
  resource_group_name  = data.azurerm_resource_group.e2e.name
  virtual_network_name = local.virtual_network.name
  address_prefixes     = [dx_available_subnet_cidr.private_app.cidr_block]

  delegation {
    name = "Microsoft.ContainerInstance/containerGroups"

    service_delegation {
      name = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

resource "azurerm_container_group" "private_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { domain = "e2e", name = "private", resource_type = "container_instance" })
  )
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_cdb.name

  identity { type = "SystemAssigned" }

  os_type = "Linux"

  container {
    name   = "network-access"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port = 8080
    }
  }

  ip_address_type = "Private"

  subnet_ids = [
    azurerm_subnet.private_app.id
  ]

  tags = local.tags
}

resource "azurerm_cosmosdb_sql_role_assignment" "infra_ci_public" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.public_cosmos_account.name
  role_definition_id  = "${module.public_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = "16b5a2ec-b378-41cf-954c-b086e32f8202"
  scope               = "${module.public_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.public_db.name}/colls/${azurerm_cosmosdb_sql_container.public_items.name}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "infra_ci_private" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.private_cosmos_account.name
  role_definition_id  = "${module.private_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = "16b5a2ec-b378-41cf-954c-b086e32f8202"
  scope               = "${module.private_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.private_db.name}/colls/${azurerm_cosmosdb_sql_container.private_items.name}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "ci_private_cosmos_public_app" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.private_cosmos_account.name
  role_definition_id  = "${module.private_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_container_group.public_app.identity[0].principal_id
  scope               = "${module.private_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.private_db.name}/colls/${azurerm_cosmosdb_sql_container.private_items.name}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "ci_private_cosmos_private_app" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.private_cosmos_account.name
  role_definition_id  = "${module.private_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_container_group.private_app.identity[0].principal_id
  scope               = "${module.private_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.private_db.name}/colls/${azurerm_cosmosdb_sql_container.private_items.name}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "ci_public_cosmos_public_app" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.public_cosmos_account.name
  role_definition_id  = "${module.public_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_container_group.public_app.identity[0].principal_id
  scope               = "${module.public_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.public_db.name}/colls/${azurerm_cosmosdb_sql_container.public_items.name}"
}

resource "azurerm_cosmosdb_sql_role_assignment" "ci_public_cosmos_private_app" {
  resource_group_name = azurerm_resource_group.e2e_cdb.name
  account_name        = module.public_cosmos_account.name
  role_definition_id  = "${module.public_cosmos_account.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_container_group.private_app.identity[0].principal_id
  scope               = "${module.public_cosmos_account.id}/dbs/${azurerm_cosmosdb_sql_database.public_db.name}/colls/${azurerm_cosmosdb_sql_container.public_items.name}"
}
