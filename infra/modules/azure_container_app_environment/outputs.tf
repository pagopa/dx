output "id" {
  value = azurerm_container_app_environment.this.id
}

output "name" {
  value = azurerm_container_app_environment.this.name
}

output "resource_group_name" {
  value = azurerm_container_app_environment.this.resource_group_name
}

output "user_assigned_identity" {
  value = azurerm_user_assigned_identity.cae_identity.client_id
}
