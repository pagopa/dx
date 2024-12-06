resource "azurerm_subnet" "pep_snet" {
  name                 = "${var.project}-pep-snet-01"
  virtual_network_name = azurerm_virtual_network.vnet.name
  resource_group_name  = var.resource_group_name
  address_prefixes     = [var.pep_snet_cidr]
}