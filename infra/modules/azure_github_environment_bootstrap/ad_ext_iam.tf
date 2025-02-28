# Resource Group
resource "azurerm_role_assignment" "externals_group_rg" {
  for_each = var.entraid_groups.externals_object_id == null ? {} : local.resource_group_ids

  scope                = each.value
  role_definition_name = "Reader"
  principal_id         = var.entraid_groups.externals_object_id
  description          = "Allow ${var.repository.name} AD external group to read resources at ${each.value} resource group scope"
}
