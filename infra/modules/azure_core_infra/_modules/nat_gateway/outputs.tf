output "nat_gateways" {
  value = [for key, ng in azurerm_nat_gateway.this : {
    id                  = azurerm_nat_gateway.this[key].id
    name                = azurerm_nat_gateway.this[key].name
    resource_group_name = azurerm_nat_gateway.this[key].resource_group_name
  }]
}

output "public_ip_prefix" {
  value = [for key, ng in azurerm_public_ip_prefix.ng : {
    id                  = azurerm_public_ip_prefix.ng[key].id
    name                = azurerm_public_ip_prefix.ng[key].name
    resource_group_name = azurerm_public_ip_prefix.ng[key].resource_group_name
  }]
}