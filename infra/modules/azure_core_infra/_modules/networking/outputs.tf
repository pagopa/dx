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

output "test_snet" {
  value = {
    id               = var.test_snet_cidr != null ? azurerm_subnet.test_snet[0].id : null
    name             = var.test_snet_cidr != null ? azurerm_subnet.test_snet[0].name : null
    address_prefixes = var.test_snet_cidr != null ? azurerm_subnet.test_snet[0].address_prefixes : null
  }
}
