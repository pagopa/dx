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