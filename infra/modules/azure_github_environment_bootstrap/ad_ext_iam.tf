# Reader role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "externals_group_subscription" {
  count = var.entraid_groups.externals_object_id == null ? 0 : 1

  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = var.entraid_groups.externals_object_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} AD external group to read resources at managed resource group scopes"
}
