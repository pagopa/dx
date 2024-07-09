resource "azurerm_role_assignment" "this" {
  for_each             = local.assignments
  role_definition_name = local.role_definition_name[lower(each.value.role)]
  scope                = each.value.event_hub_name == "*" ? data.azurerm_eventhub_namespace.this["${each.value.resource_group_name}|${each.value.namespace_name}"].id : data.azurerm_eventhub.this["${each.value.namespace_name}|${each.value.event_hub_name}"].id
  principal_id         = var.principal_id
}