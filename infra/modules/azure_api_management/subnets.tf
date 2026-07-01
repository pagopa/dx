resource "dx_available_subnet_cidr" "apim" {
  count              = local.has_existing_subnet ? 0 : 1
  virtual_network_id = data.azurerm_virtual_network.this.id
  prefix_length      = 27
}

resource "azurerm_subnet" "apim" {
  count                = local.has_existing_subnet ? 0 : 1
  name                 = local.apim_subnet_name
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.apim[0].cidr_block]
}
