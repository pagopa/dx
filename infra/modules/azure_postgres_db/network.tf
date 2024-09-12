resource "azurerm_subnet" "this" {
  count = var.private_endpoint_enabled && var.subnet_id == null ? 1 : 0

  name                 = "${local.project}-pgres-flexible-snet-${var.environment.instance_number}"
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.this.name
  address_prefixes     = [var.subnet_cidr]

  service_endpoints = var.subnet_service_endpoints != null ? concat(
    var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
    var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
    var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
  ) : []

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

resource "azurerm_private_dns_zone" "this" {
  count               = var.private_endpoint_enabled && var.private_dns_zone_id == null ? 1 : 0
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.vnet_rg.name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "this" {
  count = var.private_endpoint_enabled && var.private_dns_zone_id == null ? 1 : 0

  name                  = "${local.project}-pg-flex-link"
  private_dns_zone_name = azurerm_private_dns_zone.this[0].name

  resource_group_name = data.azurerm_resource_group.vnet_rg.name
  virtual_network_id  = data.azurerm_virtual_network.this.id

  registration_enabled = false

  tags = var.tags
}

resource "azurerm_private_dns_cname_record" "cname_record" {
  count = var.private_endpoint_enabled && var.private_dns_registration ? 1 : 0

  name                = var.private_dns_record_cname
  zone_name           = var.private_dns_zone_name
  resource_group_name = var.private_dns_zone_rg_name
  ttl                 = var.private_dns_cname_record_ttl
  record              = azurerm_postgresql_flexible_server.this.fqdn
}