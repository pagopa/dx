output "id" {
  value       = azurerm_container_app_environment.this.id
  description = "The ID of the Container App Environment resource."
}

output "name" {
  value       = azurerm_container_app_environment.this.name
  description = "The name of the Container App Environment resource."
}

output "resource_group_name" {
  value       = azurerm_container_app_environment.this.resource_group_name
  description = "The name of the Azure Resource Group where the Container App Environment is deployed."
}

output "subnet" {
  value = {
    id                  = azurerm_subnet.this.id
    name                = azurerm_subnet.this.name
    resource_group_name = azurerm_subnet.this.resource_group_name
  }
  description = "Details about the created subnet for the Container App Environment."
}

output "principal_id" {
  value       = azurerm_container_app_environment.this.identity[0].principal_id
  description = "The principal ID of the Container App Environment's system-assigned managed identity."
}

output "default_domain" {
  value       = azurerm_container_app_environment.this.default_domain
  description = "The default domain of the Container App Environment. Used for public ingress when public_network_access_enabled is true."
}

output "static_ip_address" {
  value       = azurerm_container_app_environment.this.static_ip_address
  description = "The static public IP address of the Container App Environment. Available when public_network_access_enabled is true."
}
