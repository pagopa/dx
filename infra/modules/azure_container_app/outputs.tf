output "id" {
  value       = azurerm_container_app.this.id
  description = "The ID of the Container App resource."
}

output "name" {
  value       = azurerm_container_app.this.name
  description = "The name of the Container App resource."
}

output "resource_group_name" {
  value       = azurerm_container_app.this.resource_group_name
  description = "The name of the Azure Resource Group where the Container App is deployed."
}

output "url" {
  value       = azurerm_container_app.this.latest_revision_fqdn
  description = "The URL of the Container App."
}

output "principal_id" {
  value       = azurerm_container_app.this.identity[0].principal_id
  description = "The principal ID of the system-assigned managed identity associated with this Container App."
}
