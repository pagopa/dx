resource "azurerm_subnet" "this" {
  count = local.function_app.has_existing_subnet ? 0 : 1

  name                 = local.subnet.name
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [var.subnet_cidr]

  service_endpoints = local.subnet.enable_service_endpoints

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}
