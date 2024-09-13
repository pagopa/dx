# resource "azurerm_subnet" "this" {
#   name                 = "${local.db_name_prefix}-ps-snet-${var.environment.instance_number}"
#   resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
#   virtual_network_name = data.azurerm_virtual_network.this.name
#   address_prefixes     = [var.subnet_cidr]

#   service_endpoints = var.subnet_service_endpoints != null ? concat(
#     var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
#     var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
#     var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
#   ) : []

#   delegation {
#     name = "delegation"
#     service_delegation {
#       name = "Microsoft.DBforPostgreSQL/flexibleServers"
#       actions = [
#         "Microsoft.Network/virtualNetworks/subnets/join/action",
#       ]
#     }
#   }
# }

resource "azurerm_private_endpoint" "postgre_pe" {
  name                = "${local.db_name_prefix}-ps-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.db_name_prefix}-ps-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_postgresql_flexible_server.this.id
    is_manual_connection           = false
    subresource_names              = ["postgre"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.postgre_dns_zone.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "replica_postgre_pe" {
  count = var.tier == "premium" ? 1 : 0

  name                = "${local.db_name_prefix}-ps-pep-replica-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.db_name_prefix}-ps-pep-replica-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_postgresql_flexible_server.replica[0].id
    is_manual_connection           = false
    subresource_names              = ["postgre-replica"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.postgre_dns_zone.id]
  }

  tags = var.tags
}
