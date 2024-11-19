output "vnet" {
  value = {
    id                  = azurerm_virtual_network.vnet.id
    name                = azurerm_virtual_network.vnet.name
    address_space       = azurerm_virtual_network.vnet.address_space
    resource_group_name = azurerm_virtual_network.vnet.resource_group_name
  }
}

output "pep_snet" {
  value = {
    id               = azurerm_subnet.pep_snet.id
    name             = azurerm_subnet.pep_snet.name
    address_prefixes = azurerm_subnet.pep_snet.address_prefixes
  }
}

output "nat_gateways" {
  value = [for key, ng in azurerm_nat_gateway.this : {
    id                  = azurerm_nat_gateway.this[key].id
    name                = azurerm_nat_gateway.this[key].name
    resource_group_name = azurerm_nat_gateway.this[key].resource_group_name
  }]
}