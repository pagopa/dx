output "id" {
  value       = try(azurerm_container_app.this[0].id, azapi_resource.this[0].id)
  description = "The ID of the Container App resource."
}

output "name" {
  value       = try(azurerm_container_app.this[0].name, azapi_resource.this[0].name)
  description = "The name of the Container App resource."
}

output "resource_group_name" {
  value       = try(azurerm_container_app.this[0].resource_group_name, azapi_resource.this[0].output.resource_group_name)
  description = "The name of the Azure Resource Group where the Container App is deployed."
}

output "url" {
  value       = try(azurerm_container_app.this[0].latest_revision_fqdn, azapi_resource.this[0].output.properties.configuration.ingress.fqdn)
  description = "The URL of the Container App."
}

output "principal_id" {
  value       = try(azurerm_container_app.this[0].identity[0].principal_id, azapi_resource.this[0].identity[0].principal_id)
  description = "The principal ID of the system-assigned managed identity associated with this Container App."
}
