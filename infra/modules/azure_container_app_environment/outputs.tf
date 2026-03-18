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

output "user_assigned_identity" {
  value = {
    id           = azurerm_user_assigned_identity.cae_identity.id
    name         = azurerm_user_assigned_identity.cae_identity.name
    client_id    = azurerm_user_assigned_identity.cae_identity.client_id
    principal_id = azurerm_user_assigned_identity.cae_identity.principal_id
  }

  description = "Details about the user-assigned managed identity created to manage roles of the Container Apps of this Environment"
}

output "default_domain" {
  value       = azurerm_container_app_environment.this.default_domain
  description = "The default domain of the Container App Environment. Used for public ingress when internal_load_balancer_enabled is false."
}

output "static_ip_address" {
  value       = azurerm_container_app_environment.this.static_ip_address
  description = "The static public IP address of the Container App Environment. Available when internal_load_balancer_enabled is false."
}
