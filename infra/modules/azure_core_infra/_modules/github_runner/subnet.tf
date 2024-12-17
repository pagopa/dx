resource "azurerm_subnet" "runner_snet" {
  name                 = "${var.prefix}-snet-${var.suffix}"
  virtual_network_name = var.virtual_network.name
  resource_group_name  = var.virtual_network.resource_group_name
  address_prefixes     = [var.subnet_cidr]
}