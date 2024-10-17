resource "azurerm_resource_group" "main" {
  name     = local.resource_group.name
  location = local.resource_group.location

  tags = var.tags
}
