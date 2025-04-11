output "id" {
  value       = azurerm_container_app.this.id
  description = "Resource Id of the Container App"
}

output "name" {
  value       = azurerm_container_app.this.name
  description = "Name of the Container App"
}

output "resource_group_name" {
  value       = azurerm_container_app.this.resource_group_name
  description = "Resource Group of the Container App"
}

output "url" {
  value       = azurerm_container_app.this.latest_revision_fqdn
  description = "URL of the Container App"
}

output "principal_id" {
  value       = azurerm_container_app.this.identity[0].principal_id
  description = "Client Id of the system-assigned managed identity of this Container App"
}
