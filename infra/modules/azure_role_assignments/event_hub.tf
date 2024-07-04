data "azurerm_eventhub_namespace" "this" {
  for_each            = { for namespace in local.event_hub.namespaces : "${namespace.resource_group_name}|${namespace.namespace_name}" => namespace }
  name                = each.value.namespace_name
  resource_group_name = each.value.resource_group_name
}

data "azurerm_eventhub" "this" {
  for_each            = { for event_hub in local.event_hub.event_hubs : "${event_hub.namespace_name}|${event_hub.event_hub_name}" => event_hub }
  name                = each.value.event_hub_name
  namespace_name      = each.value.namespace_name
  resource_group_name = each.value.resource_group_name
}

resource "azurerm_role_assignment" "this" {
  for_each             = local.event_hub.assignments
  role_definition_name = local.event_hub.role_definition_name[lower(each.value.role)]
  scope                = each.value.event_hub_name == "*" ? data.azurerm_eventhub_namespace.this["${each.value.resource_group_name}|${each.value.namespace_name}"].id : data.azurerm_eventhub.this["${each.value.namespace_name}|${each.value.event_hub_name}"].id
  principal_id         = var.principal_id
}