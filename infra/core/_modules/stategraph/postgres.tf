resource "dx_available_subnet_cidr" "psql_subnet_cidr" {
  virtual_network_id = var.vnet.id
  prefix_length      = 24
}

resource "azurerm_subnet" "stategraph_psql" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "subnet",
    app_name      = "stategraph-psql"
  }))

  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.psql_subnet_cidr.cidr_block]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# manually enable the extension "azure.extensions"
resource "azurerm_postgresql_flexible_server" "stategraph" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type   = "postgresql",
    instance_number = "03"
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  zone         = "1"
  version      = "18"
  sku_name     = "GP_Standard_D2ds_v5"
  storage_tier = "P4"
  storage_mb   = "32768"

  auto_grow_enabled            = true
  backup_retention_days        = 7
  geo_redundant_backup_enabled = true

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  public_network_access_enabled = false
  delegated_subnet_id           = azurerm_subnet.stategraph_psql.id
  private_dns_zone_id           = var.postgres_dns_zone_id

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
    tenant_id                     = var.tenant_id

  }

  administrator_login               = "stategraph"
  administrator_password_wo         = "123456789"
  administrator_password_wo_version = 0

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "admins" {
  for_each = var.admins

  server_name         = azurerm_postgresql_flexible_server.stategraph.name
  resource_group_name = azurerm_postgresql_flexible_server.stategraph.resource_group_name
  tenant_id           = var.tenant_id
  object_id           = each.value
  principal_name      = each.key
  principal_type      = "User"
}

resource "azurerm_private_endpoint" "psql_stategraph" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "postgre_private_endpoint",
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  subnet_id           = var.pep_subnet_id

  private_service_connection {
    name = provider::dx::resource_name(merge(var.environment, {
      resource_type = "postgre_private_endpoint",
    }))
    private_connection_resource_id = azurerm_postgresql_flexible_server.stategraph.id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.postgres_dns_zone_id]
  }

  tags = var.tags
}

