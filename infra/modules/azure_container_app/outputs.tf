output "container_app_name" {
  value = {
    name                = azurerm_container_app.this.name
    id                  = azurerm_container_app.this.id
    resource_group_name = azurerm_container_app.this.resource_group_name
    url                 = azurerm_container_app.this.latest_revision_fqdn
  }
}

output "container_app_environment" {
  value = !var.create_container_app_environment ? null : {
    name                = azurerm_container_app_environment.this[0].name
    id                  = azurerm_container_app_environment.this[0].id
    resource_group_name = azurerm_container_app_environment.this[0].resource_group_name
  }
}