output "name" {
  value = azurerm_container_app.this.name
}

output "id" {
  value = azurerm_container_app.this.id
}

output "resource_group_name" {
  value = azurerm_container_app.this.resource_group_name
}

output "azurerm_container_app_url" {
  value = azurerm_container_app.this.latest_revision_fqdn
}