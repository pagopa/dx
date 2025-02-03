# Resource Group
resource "azurerm_role_assignment" "externals_group_rg" {
  count = var.entraid_groups.externals_object_id == null ? 0 : 1

  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = var.entraid_groups.externals_object_id
  description          = "Allow ${var.repository.name} AD external group to read resources at resource group scope"
}
