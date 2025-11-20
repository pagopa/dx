resource "azurerm_role_assignment" "this" {
  for_each = local.app_config_assignments

  role_definition_name = each.value.role_definition_name
  scope                = each.value.id
  principal_id         = var.principal_id
  description          = each.value.description
}
