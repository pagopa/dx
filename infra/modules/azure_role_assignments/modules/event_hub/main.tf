resource "azurerm_role_assignment" "this" {
  for_each             = local.assignments
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = each.value.event_hub_name == "*" ? each.value.namespace_id : each.value.event_hub_id
  principal_id         = var.principal_id
  description          = each.value.description
}