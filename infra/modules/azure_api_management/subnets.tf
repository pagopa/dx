resource "dx_available_subnet_cidr" "apim" {
  virtual_network_id = data.azurerm_virtual_network.this.id
  prefix_length      = 24
}

resource "azurerm_subnet" "apim" {
  name                 = local.apim_subnet_name
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.apim.cidr_block]
}
