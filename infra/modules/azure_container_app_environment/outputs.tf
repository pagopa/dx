output "id" {
  value       = azurerm_container_app_environment.this.id
  description = "Container App Environment Resource Id"
}

output "name" {
  value       = azurerm_container_app_environment.this.name
  description = "Container App Environment name"
}

output "resource_group_name" {
  value       = azurerm_container_app_environment.this.resource_group_name
  description = "Container App Environment resource group"
}

output "user_assigned_identity" {
  value = {
    id           = azurerm_user_assigned_identity.cae_identity.id
    name         = azurerm_user_assigned_identity.cae_identity.name
    client_id    = azurerm_user_assigned_identity.cae_identity.client_id
    principal_id = azurerm_user_assigned_identity.cae_identity.principal_id
  }

  description = "Details about the user-assigned managed identity created to manage roles of the Container Apps of this Environment"
}
