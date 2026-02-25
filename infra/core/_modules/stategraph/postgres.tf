resource "dx_available_subnet_cidr" "psql_subnet_cidr" {
  virtual_network_id = var.vnet.id
  prefix_length      = 24
}

ephemeral "random_password" "psql" {
  length      = 16
  special     = true
  min_lower   = 1
  min_upper   = 1
  min_numeric = 1
  min_special = 1
}

resource "azurerm_subnet" "stategraph_psql" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "subnet",
    app_name      = "stategraph-psql"
  }))

  resource_group_name  = var.vnet.resource_group_name
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

#trivy:ignore:AZU-0019
#trivy:ignore:AZU-0021
#trivy:ignore:AZU-0024
#trivy:ignore:AZU-0026
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
  storage_mb   = 32768

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
  administrator_password_wo         = ephemeral.random_password.psql.result
  administrator_password_wo_version = 1

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

resource "azurerm_postgresql_flexible_server_configuration" "azure_extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.stategraph.id
  value     = "PGCRYPTO"
}

resource "azurerm_network_security_group" "psql" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "network_security_group",
    app_name      = "stategraph-psql"
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  tags = var.tags
}

resource "azurerm_network_security_rule" "allow_inbound_ca_to_psql" {
  name                       = "AllowAccessFromCA"
  access                     = "Allow"
  description                = "Allow Stategraph container to access PostgreSQL server"
  priority                   = 100
  direction                  = "Inbound"
  protocol                   = "Tcp"
  source_port_range          = "*"
  source_address_prefix      = dx_available_subnet_cidr.cae_subnet_cidr.cidr_block
  destination_port_range     = "5432"
  destination_address_prefix = dx_available_subnet_cidr.psql_subnet_cidr.cidr_block

  network_security_group_name = azurerm_network_security_group.psql.name
  resource_group_name         = var.resource_group_name
}

resource "azurerm_network_security_rule" "deny_inbound_all_to_psql" {
  name                       = "DenyAllInbound"
  access                     = "Deny"
  description                = "Deny all inbound traffic"
  priority                   = 200
  direction                  = "Inbound"
  protocol                   = "*"
  source_port_range          = "*"
  source_address_prefix      = "*"
  destination_port_range     = "*"
  destination_address_prefix = "*"

  network_security_group_name = azurerm_network_security_group.psql.name
  resource_group_name         = var.resource_group_name
}
