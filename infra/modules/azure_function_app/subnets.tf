resource "azurerm_subnet" "this" {
  name                 = "${local.project}-${var.domain}-${var.app_name}-snet-${var.instance_number}"
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [var.subnet_cidr]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}
