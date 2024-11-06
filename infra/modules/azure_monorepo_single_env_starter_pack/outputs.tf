output "resource_group" {
  value = {
    id       = azurerm_resource_group.main.id
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
  }
}
