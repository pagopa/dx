output "id" {
  value = azurerm_container_app.this.id
}

output "name" {
  value = azurerm_container_app.this.name
}

output "resource_group_name" {
  value = azurerm_container_app.this.resource_group_name
}

output "url" {
  value = azurerm_container_app.this.latest_revision_fqdn
}

output "principal_id" {
  value = azurerm_container_app.this.identity[0].principal_id
}
