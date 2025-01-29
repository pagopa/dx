output "id" {
  value = azurerm_api_management.this.id
}

output "name" {
  value = azurerm_api_management.this.name
}

output "private_ip_addresses" {
  value = azurerm_api_management.this.private_ip_addresses
}

output "public_ip_addresses" {
  value = azurerm_api_management.this.public_ip_addresses
}

output "gateway_url" {
  value = azurerm_api_management.this.gateway_url
}

output "principal_id" {
  value = azurerm_api_management.this.identity[0].principal_id
}