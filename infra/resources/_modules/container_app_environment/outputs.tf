output "container_app_environment_id" {
  value       = azurerm_container_app_environment.this.id
  description = "The ID of the Container App Environment resource."
}

output "container_app_environment_name" {
  value       = azurerm_container_app_environment.this.name
  description = "The name of the Container App Environment resource."
}

output "container_app_subnet_id" {
  value       = azurerm_subnet.container_app.id
  description = "The ID of the subnet dedicated to Container App Environment and Container Apps."
}

output "container_app_private_dns_zone_id" {
  value       = data.azurerm_private_dns_zone.container_app.id
  description = "The ID of the private DNS zone for Container Apps."
}

output "container_app_private_dns_zone_name" {
  value       = data.azurerm_private_dns_zone.container_app.name
  description = "The name of the private DNS zone for Container Apps."
}

output "user_assigned_identity_id" {
  value       = azurerm_user_assigned_identity.container_app.id
  description = "The ID of the user-assigned managed identity for Container Apps."
}

output "user_assigned_identity_principal_id" {
  value       = azurerm_user_assigned_identity.container_app.principal_id
  description = "The principal ID of the user-assigned managed identity for Container Apps."
}
