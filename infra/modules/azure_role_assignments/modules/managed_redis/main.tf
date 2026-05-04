# Control-plane role assignments (reader, owner)
resource "azurerm_role_assignment" "this" {
  for_each             = local.control_plane_assignments
  role_definition_name = local.control_plane_role_name[each.value.role]
  scope                = each.value.id
  principal_id         = var.principal_id
  description          = each.value.description
}

# Data-plane access policy assignments (writer, owner)
resource "azurerm_managed_redis_access_policy_assignment" "this" {
  for_each         = local.data_plane_assignments
  managed_redis_id = each.value.id
  object_id        = var.principal_id
}
