output "id" {
  value = azurerm_container_app_environment.this.id
}

output "name" {
  value = azurerm_container_app_environment.this.name
}

output "resource_group_name" {
  value = azurerm_container_app_environment.this.resource_group_name
}

output "private_dns_zone" {
  value = {
    name                = data.azurerm_private_dns_zone.this.name
    resource_group_name = data.azurerm_private_dns_zone.this.resource_group_name
  }
}

output "private_endpoint_ip" {
  value = azurerm_private_endpoint.this.private_service_connection[0].private_ip_address
}