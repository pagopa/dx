resource "azurerm_subnet" "this" {
  name                 = "${local.db_name_prefix}-ps-snet-${var.environment.instance_number}"
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